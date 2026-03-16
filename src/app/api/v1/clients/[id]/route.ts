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
import { clientSchema } from "@/lib/api/validate";

// ─── GET /api/v1/clients/[id] ────────────────
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authResult = await authenticateRequest(request, ["admin", "staff"]);
    if (!isAuthUser(authResult)) return authResult;

    const { id } = await params;
    const supabase = await createClient();

    const { data: client } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id)
        .eq("is_active", true)
        .single();

    if (!client) {
        return notFound("Client not found");
    }

    // Get aggregated stats
    const [ordersResult, invoicesResult] = await Promise.all([
        supabase
            .from("orders")
            .select("id, total_amount, status", { count: "exact" })
            .eq("client_id", id)
            .eq("is_deleted", false),
        supabase
            .from("invoices")
            .select("id, total_amount, amount_paid, amount_due, payment_status", { count: "exact" })
            .eq("client_id", id)
            .eq("is_deleted", false),
    ]);

    const orders = ordersResult.data || [];
    const invoices = invoicesResult.data || [];

    const stats = {
        total_orders: ordersResult.count || 0,
        total_invoices: invoicesResult.count || 0,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        total_business_value: (orders as any[]).reduce((sum: number, o: any) => sum + Number(o.total_amount), 0),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        total_paid: (invoices as any[]).reduce((sum: number, i: any) => sum + Number(i.amount_paid), 0),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        total_outstanding: (invoices as any[]).reduce((sum: number, i: any) => sum + Number(i.amount_due), 0),
    };

    return success({ ...client, stats });
}

// ─── PATCH /api/v1/clients/[id] ──────────────
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authResult = await authenticateRequest(request, ["admin", "staff"]);
    if (!isAuthUser(authResult)) return authResult;

    const { id } = await params;
    const body = await request.json();
    const parsed = clientSchema.partial().safeParse(body);
    if (!parsed.success) {
        return validationError(parsed.error.issues.map((e: { message: string }) => e.message).join(", "));
    }

    const supabase = await createClient();

    const { data: existing } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id)
        .eq("is_active", true)
        .single();

    if (!existing) {
        return notFound("Client not found");
    }

    const { data, error: updateError } = await supabase
        .from("clients")
        .update(parsed.data)
        .eq("id", id)
        .select()
        .single();

    if (updateError) {
        return serverError(updateError.message);
    }

    await supabase.from("audit_logs").insert({
        entity_type: "client",
        entity_id: id,
        action: "update",
        old_data: existing,
        new_data: data,
        performed_by: authResult.id,
        ip_address: getClientIP(request),
    });

    return success(data);
}

// ─── DELETE /api/v1/clients/[id] ─────────────
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authResult = await authenticateRequest(request, ["admin"]);
    if (!isAuthUser(authResult)) return authResult;

    const { id } = await params;
    const supabase = await createClient();

    const { data: existing } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id)
        .single();

    if (!existing) {
        return notFound("Client not found");
    }

    await supabase
        .from("clients")
        .update({ is_active: false })
        .eq("id", id);

    await supabase.from("audit_logs").insert({
        entity_type: "client",
        entity_id: id,
        action: "delete",
        old_data: existing,
        performed_by: authResult.id,
        ip_address: getClientIP(request),
    });

    return success({ message: "Client deactivated" });
}
