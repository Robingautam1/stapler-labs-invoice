import { createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";
import {
    success,
    notFound,
    validationError,
    serverError,
} from "@/lib/api/response";
import {
    authenticateRequest,
    isAuthUser,
    getClientIP,
} from "@/lib/api/auth-guard";
import {
    updateOrderSchema,
    statusTransitionSchema,
    VALID_STATUS_TRANSITIONS,
} from "@/lib/api/validate";

// ─── GET /api/v1/orders/[id] ─────────────────
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authResult = await authenticateRequest(request, ["admin", "staff"]);
    if (!isAuthUser(authResult)) return authResult;

    const { id } = await params;
    const supabase = await createClient();

    const { data, error: queryError } = await supabase
        .from("orders")
        .select(`
      *,
      items:order_items(* order by sort_order),
      client:clients(id, company_name, contact_person, contact_email, contact_phone),
      creator:profiles!orders_created_by_fkey(id, full_name, email),
      assignee:profiles!orders_assigned_to_fkey(id, full_name, email),
      status_history:order_status_history(*, changed_by_profile:profiles!order_status_history_changed_by_fkey(id, full_name) order by changed_at desc),
      attachments(*)
    `)
        .eq("id", id)
        .eq("is_deleted", false)
        .single();

    if (queryError || !data) {
        return notFound("Order not found");
    }

    return success(data);
}

// ─── PATCH /api/v1/orders/[id] ───────────────
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authResult = await authenticateRequest(request, ["admin", "staff"]);
    if (!isAuthUser(authResult)) return authResult;

    const { id } = await params;
    const body = await request.json();
    const parsed = updateOrderSchema.safeParse(body);
    if (!parsed.success) {
        return validationError(parsed.error.issues.map((e: { message: string }) => e.message).join(", "));
    }

    const supabase = await createClient();

    // Get existing order
    const { data: existing } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .eq("is_deleted", false)
        .single();

    if (!existing) {
        return notFound("Order not found");
    }

    const { items, ...updates } = parsed.data;

    // Recalculate if items provided
    if (items && items.length > 0) {
        const subtotal = items.reduce((sum, item) => {
            return sum + item.quantity * item.unit_price * (1 - (item.discount_percent || 0) / 100);
        }, 0);

        const discountType = updates.discount_type ?? existing.discount_type;
        const discountValue = updates.discount_value ?? existing.discount_value ?? 0;
        const taxRate = updates.tax_rate ?? existing.tax_rate ?? 0;

        const discountAmount =
            discountType === "percent"
                ? subtotal * (discountValue / 100)
                : discountValue;

        const afterDiscount = subtotal - discountAmount;
        const taxAmount = afterDiscount * (taxRate / 100);

        Object.assign(updates, {
            subtotal,
            discount_amount: discountAmount,
            tax_amount: taxAmount,
            total_amount: afterDiscount + taxAmount,
        });

        // Replace items
        await supabase.from("order_items").delete().eq("order_id", id);
        await supabase.from("order_items").insert(
            items.map((item, index) => ({
                order_id: id,
                product_name: item.product_name,
                sku: item.sku || null,
                quantity: item.quantity,
                unit_price: item.unit_price,
                tax_rate: item.tax_rate || 0,
                discount_percent: item.discount_percent || 0,
                line_total: item.quantity * item.unit_price * (1 - (item.discount_percent || 0) / 100),
                sort_order: index,
            }))
        );
    }

    const { data: updated, error: updateError } = await supabase
        .from("orders")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

    if (updateError) {
        return serverError(updateError.message);
    }

    // Audit
    await supabase.from("audit_logs").insert({
        entity_type: "order",
        entity_id: id,
        action: "update",
        old_data: existing,
        new_data: updated,
        performed_by: authResult.id,
        ip_address: getClientIP(request),
    });

    return success(updated);
}

// ─── DELETE /api/v1/orders/[id] ──────────────
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authResult = await authenticateRequest(request, ["admin"]);
    if (!isAuthUser(authResult)) return authResult;

    const { id } = await params;
    const supabase = await createClient();

    const { data: existing } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .single();

    if (!existing) {
        return notFound("Order not found");
    }

    // Soft delete
    const { error: deleteError } = await supabase
        .from("orders")
        .update({ is_deleted: true })
        .eq("id", id);

    if (deleteError) {
        return serverError(deleteError.message);
    }

    // Audit
    await supabase.from("audit_logs").insert({
        entity_type: "order",
        entity_id: id,
        action: "delete",
        old_data: existing,
        performed_by: authResult.id,
        ip_address: getClientIP(request),
    });

    return success({ message: "Order deleted" });
}

// ─── POST /api/v1/orders/[id] (status transition) ──
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authResult = await authenticateRequest(request, ["admin", "staff"]);
    if (!isAuthUser(authResult)) return authResult;

    const { id } = await params;
    const body = await request.json();
    const parsed = statusTransitionSchema.safeParse(body);
    if (!parsed.success) {
        return validationError(parsed.error.issues.map((e: { message: string }) => e.message).join(", "));
    }

    const { to_status, notes } = parsed.data;
    const supabase = await createClient();

    const { data: order } = await supabase
        .from("orders")
        .select("id, status")
        .eq("id", id)
        .eq("is_deleted", false)
        .single();

    if (!order) {
        return notFound("Order not found");
    }

    // Validate transition
    const validTransitions = VALID_STATUS_TRANSITIONS[order.status] || [];
    if (!validTransitions.includes(to_status)) {
        return validationError(
            `Cannot transition from "${order.status}" to "${to_status}". Valid transitions: ${validTransitions.join(", ") || "none"}`
        );
    }

    // Update status
    const { data: updated, error: updateError } = await supabase
        .from("orders")
        .update({ status: to_status })
        .eq("id", id)
        .select()
        .single();

    if (updateError) {
        return serverError(updateError.message);
    }

    // Log status change
    await supabase.from("order_status_history").insert({
        order_id: id,
        from_status: order.status,
        to_status,
        changed_by: authResult.id,
        ip_address: getClientIP(request),
        notes: notes || null,
    });

    // Audit
    await supabase.from("audit_logs").insert({
        entity_type: "order",
        entity_id: id,
        action: "status_change",
        old_data: { status: order.status },
        new_data: { status: to_status },
        performed_by: authResult.id,
        ip_address: getClientIP(request),
    });

    return success(updated);
}
