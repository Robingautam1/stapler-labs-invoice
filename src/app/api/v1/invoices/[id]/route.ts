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
import { updateInvoiceSchema } from "@/lib/api/validate";

// ─── GET /api/v1/invoices/[id] ───────────────
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authResult = await authenticateRequest(request, ["admin", "staff"]);
    if (!isAuthUser(authResult)) return authResult;

    const { id } = await params;
    const supabase = await createClient();

    const { data, error: queryError } = await supabase
        .from("invoices")
        .select(`
      *,
      items:invoice_items(* order by sort_order),
      client:clients(id, company_name, contact_person, contact_email, contact_phone, billing_address, gst_number),
      creator:profiles!invoices_created_by_fkey(id, full_name, email),
      order:orders(id, order_number, status),
      payments(* order by payment_date desc)
    `)
        .eq("id", id)
        .eq("is_deleted", false)
        .single();

    if (queryError || !data) {
        return notFound("Invoice not found");
    }

    return success(data);
}

// ─── PATCH /api/v1/invoices/[id] ─────────────
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authResult = await authenticateRequest(request, ["admin", "staff"]);
    if (!isAuthUser(authResult)) return authResult;

    const { id } = await params;
    const body = await request.json();
    const parsed = updateInvoiceSchema.safeParse(body);
    if (!parsed.success) {
        return validationError(parsed.error.issues.map((e: { message: string }) => e.message).join(", "));
    }

    const supabase = await createClient();

    const { data: existing } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", id)
        .eq("is_deleted", false)
        .single();

    if (!existing) {
        return notFound("Invoice not found");
    }

    const { data: updated, error: updateError } = await supabase
        .from("invoices")
        .update(parsed.data)
        .eq("id", id)
        .select()
        .single();

    if (updateError) {
        return serverError(updateError.message);
    }

    await supabase.from("audit_logs").insert({
        entity_type: "invoice",
        entity_id: id,
        action: "update",
        old_data: existing,
        new_data: updated,
        performed_by: authResult.id,
        ip_address: getClientIP(request),
    });

    return success(updated);
}

// ─── DELETE /api/v1/invoices/[id] ────────────
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authResult = await authenticateRequest(request, ["admin"]);
    if (!isAuthUser(authResult)) return authResult;

    const { id } = await params;
    const supabase = await createClient();

    const { data: existing } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", id)
        .single();

    if (!existing) {
        return notFound("Invoice not found");
    }

    await supabase
        .from("invoices")
        .update({ is_deleted: true })
        .eq("id", id);

    await supabase.from("audit_logs").insert({
        entity_type: "invoice",
        entity_id: id,
        action: "delete",
        old_data: existing,
        performed_by: authResult.id,
        ip_address: getClientIP(request),
    });

    return success({ message: "Invoice deleted" });
}
