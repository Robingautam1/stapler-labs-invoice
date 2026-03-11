import { createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";
import {
    success,
    created,
    notFound,
    validationError,
    serverError,
} from "@/lib/api/response";
import {
    authenticateRequest,
    isAuthUser,
    getClientIP,
} from "@/lib/api/auth-guard";
import { paymentSchema } from "@/lib/api/validate";

// ─── GET /api/v1/invoices/[id]/payments ──────
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authResult = await authenticateRequest(request, ["admin", "staff"]);
    if (!isAuthUser(authResult)) return authResult;

    const { id } = await params;
    const supabase = await createClient();

    const { data, error: queryError } = await supabase
        .from("payments")
        .select("*, recorded_by_profile:profiles!payments_recorded_by_fkey(id, full_name)")
        .eq("invoice_id", id)
        .order("payment_date", { ascending: false });

    if (queryError) {
        return serverError(queryError.message);
    }

    return success(data || []);
}

// ─── POST /api/v1/invoices/[id]/payments ─────
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authResult = await authenticateRequest(request, ["admin", "staff"]);
    if (!isAuthUser(authResult)) return authResult;

    const { id } = await params;
    const body = await request.json();
    const parsed = paymentSchema.safeParse(body);
    if (!parsed.success) {
        return validationError(parsed.error.issues.map((e: { message: string }) => e.message).join(", "));
    }

    const supabase = await createClient();

    // Check invoice exists
    const { data: invoice } = await supabase
        .from("invoices")
        .select("id, total_amount, amount_paid, amount_due, invoice_number")
        .eq("id", id)
        .eq("is_deleted", false)
        .single();

    if (!invoice) {
        return notFound("Invoice not found");
    }

    // Check payment doesn't exceed amount_due
    if (parsed.data.amount > Number(invoice.amount_due)) {
        return validationError(
            `Payment amount (₹${parsed.data.amount}) exceeds amount due (₹${invoice.amount_due})`
        );
    }

    const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .insert({
            invoice_id: id,
            amount: parsed.data.amount,
            method: parsed.data.method,
            reference_number: parsed.data.reference_number || null,
            notes: parsed.data.notes || null,
            payment_date: parsed.data.payment_date || new Date().toISOString().split("T")[0],
            recorded_by: authResult.id,
        })
        .select()
        .single();

    if (paymentError) {
        return serverError(paymentError.message);
    }

    // Audit
    await supabase.from("audit_logs").insert({
        entity_type: "payment",
        entity_id: payment.id,
        action: "create",
        new_data: { ...payment, invoice_number: invoice.invoice_number },
        performed_by: authResult.id,
        ip_address: getClientIP(request),
    });

    // Get updated invoice
    const { data: updatedInvoice } = await supabase
        .from("invoices")
        .select("id, payment_status, amount_paid, amount_due")
        .eq("id", id)
        .single();

    return created({ payment, invoice: updatedInvoice });
}
