import { createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";
import {
    success,
    created,
    paginated,
    validationError,
    serverError,
} from "@/lib/api/response";
import {
    authenticateRequest,
    isAuthUser,
    getClientIP,
} from "@/lib/api/auth-guard";
import {
    createInvoiceSchema,
    invoiceFilterSchema,
    parseSearchParams,
} from "@/lib/api/validate";

// ─── GET /api/v1/invoices ────────────────────
export async function GET(request: NextRequest) {
    const authResult = await authenticateRequest(request, ["admin", "staff"]);
    if (!isAuthUser(authResult)) return authResult;

    const filterResult = parseSearchParams(
        request.nextUrl.searchParams,
        invoiceFilterSchema
    );
    if (!filterResult.success) {
        return validationError(filterResult.error.issues.map((e: { message: string }) => e.message).join(", "));
    }

    const { page, limit, payment_status, client_id, search } = filterResult.data as { page: number; limit: number; payment_status?: string; client_id?: string; search?: string };
    const offset = (page - 1) * limit;

    const supabase = await createClient();

    let query = supabase
        .from("invoices")
        .select("*, client:clients(id, company_name), creator:profiles!invoices_created_by_fkey(id, full_name)", { count: "exact" })
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    if (payment_status) query = query.eq("payment_status", payment_status);
    if (client_id) query = query.eq("client_id", client_id);
    if (search) query = query.ilike("invoice_number", `%${search}%`);

    const { data, count, error: queryError } = await query;

    if (queryError) {
        console.error("Invoices query error:", queryError);
        return serverError(queryError.message);
    }

    return paginated(data || [], { page, limit, total: count || 0 });
}

// ─── POST /api/v1/invoices ───────────────────
export async function POST(request: NextRequest) {
    const authResult = await authenticateRequest(request, ["admin", "staff"]);
    if (!isAuthUser(authResult)) return authResult;

    try {
        const body = await request.json();

        // Check if generating from order
        if (body.from_order_id) {
            return await generateFromOrder(request, body.from_order_id, authResult);
        }

        const parsed = createInvoiceSchema.safeParse(body);
        if (!parsed.success) {
            return validationError(parsed.error.issues.map((e: { message: string }) => e.message).join(", "));
        }

        const { items, ...invoiceData } = parsed.data;

        // Calculate totals
        const subtotal = items.reduce((sum, item) => {
            return sum + item.quantity * item.unit_price;
        }, 0);

        const discountAmount =
            invoiceData.discount_type === "percent"
                ? subtotal * ((invoiceData.discount_value || 0) / 100)
                : invoiceData.discount_value || 0;

        const afterDiscount = subtotal - discountAmount;
        const taxAmount = afterDiscount * ((invoiceData.tax_rate || 0) / 100);
        const totalAmount = afterDiscount + taxAmount;

        const supabase = await createClient();

        const { data: invoice, error: invoiceError } = await supabase
            .from("invoices")
            .insert({
                invoice_number: "", // trigger will set
                client_id: invoiceData.client_id,
                order_id: invoiceData.order_id || null,
                created_by: authResult.id,
                issue_date: invoiceData.issue_date || new Date().toISOString().split("T")[0],
                due_date: invoiceData.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                notes: invoiceData.notes || null,
                payment_terms: invoiceData.payment_terms || null,
                discount_type: invoiceData.discount_type || null,
                discount_value: invoiceData.discount_value || 0,
                subtotal,
                discount_amount: discountAmount,
                tax_rate: invoiceData.tax_rate || 0,
                tax_amount: taxAmount,
                total_amount: totalAmount,
                amount_due: totalAmount,
            })
            .select()
            .single();

        if (invoiceError) {
            console.error("Invoice insert error:", invoiceError);
            return serverError(invoiceError.message);
        }

        // Insert items
        await supabase.from("invoice_items").insert(
            items.map((item, index) => ({
                invoice_id: invoice.id,
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unit_price,
                tax_rate: item.tax_rate || 0,
                line_total: item.quantity * item.unit_price,
                sort_order: index,
            }))
        );

        // Audit
        await supabase.from("audit_logs").insert({
            entity_type: "invoice",
            entity_id: invoice.id,
            action: "create",
            new_data: invoice,
            performed_by: authResult.id,
            ip_address: getClientIP(request),
        });

        const { data: completeInvoice } = await supabase
            .from("invoices")
            .select("*, items:invoice_items(*), client:clients(id, company_name)")
            .eq("id", invoice.id)
            .single();

        return created(completeInvoice);
    } catch (err) {
        console.error("Create invoice error:", err);
        return serverError();
    }
}

// ─── Generate invoice from order ─────────────
async function generateFromOrder(
    request: NextRequest,
    orderId: string,
    authUser: { id: string }
) {
    const supabase = await createClient();

    const { data: order } = await supabase
        .from("orders")
        .select("*, items:order_items(*)")
        .eq("id", orderId)
        .eq("is_deleted", false)
        .single();

    if (!order) {
        return validationError("Order not found");
    }

    if (order.status === "draft") {
        return validationError("Cannot generate invoice from a draft order. Confirm the order first.");
    }

    // Check if invoice already exists for this order
    const { data: existingInvoice } = await supabase
        .from("invoices")
        .select("id, invoice_number")
        .eq("order_id", orderId)
        .eq("is_deleted", false)
        .single();

    if (existingInvoice) {
        return validationError(
            `Invoice ${existingInvoice.invoice_number} already exists for this order`
        );
    }

    // Create invoice from order data
    const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
            invoice_number: "",
            order_id: orderId,
            client_id: order.client_id,
            created_by: authUser.id,
            subtotal: order.subtotal,
            discount_type: order.discount_type,
            discount_value: order.discount_value,
            discount_amount: order.discount_amount,
            tax_rate: order.tax_rate,
            tax_amount: order.tax_amount,
            total_amount: order.total_amount,
            amount_due: order.total_amount,
        })
        .select()
        .single();

    if (invoiceError) {
        return serverError(invoiceError.message);
    }

    // Copy line items
    if (order.items && order.items.length > 0) {
        await supabase.from("invoice_items").insert(
            order.items.map((item: Record<string, unknown>, index: number) => ({
                invoice_id: invoice.id,
                description: item.product_name,
                quantity: item.quantity,
                unit_price: item.unit_price,
                tax_rate: item.tax_rate || 0,
                line_total: item.line_total,
                sort_order: index,
            }))
        );
    }

    // Audit
    await supabase.from("audit_logs").insert({
        entity_type: "invoice",
        entity_id: invoice.id,
        action: "create",
        new_data: { ...invoice, generated_from_order: orderId },
        performed_by: authUser.id,
        ip_address: getClientIP(request),
    });

    const { data: completeInvoice } = await supabase
        .from("invoices")
        .select("*, items:invoice_items(*), client:clients(id, company_name)")
        .eq("id", invoice.id)
        .single();

    return created(completeInvoice);
}
