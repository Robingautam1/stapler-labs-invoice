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
import { clientSchema, paginationSchema, parseSearchParams } from "@/lib/api/validate";

// ─── GET /api/v1/clients ─────────────────────
export async function GET(request: NextRequest) {
    const authResult = await authenticateRequest(request, ["admin", "staff"]);
    if (!isAuthUser(authResult)) return authResult;

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";

    const filterResult = parseSearchParams(searchParams, paginationSchema);
    if (!filterResult.success) {
        return validationError(filterResult.error.issues.map((e: { message: string }) => e.message).join(", "));
    }

    const { page, limit } = filterResult.data as { page: number; limit: number };
    const offset = (page - 1) * limit;

    const supabase = await createClient();

    let query = supabase
        .from("clients")
        .select("*", { count: "exact" })
        .eq("is_active", true)
        .order("company_name")
        .range(offset, offset + limit - 1);

    if (search) {
        query = query.or(`company_name.ilike.%${search}%,contact_person.ilike.%${search}%,contact_email.ilike.%${search}%`);
    }

    const { data, count, error: queryError } = await query;

    if (queryError) {
        return serverError(queryError.message);
    }

    return paginated(data || [], { page, limit, total: count || 0 });
}

// ─── POST /api/v1/clients ────────────────────
export async function POST(request: NextRequest) {
    const authResult = await authenticateRequest(request, ["admin", "staff"]);
    if (!isAuthUser(authResult)) return authResult;

    const body = await request.json();
    const parsed = clientSchema.safeParse(body);
    if (!parsed.success) {
        return validationError(parsed.error.issues.map((e: { message: string }) => e.message).join(", "));
    }

    const supabase = await createClient();

    const { data, error: insertError } = await supabase
        .from("clients")
        .insert(parsed.data)
        .select()
        .single();

    if (insertError) {
        return serverError(insertError.message);
    }

    // Audit
    await supabase.from("audit_logs").insert({
        entity_type: "client",
        entity_id: data.id,
        action: "create",
        new_data: data,
        performed_by: authResult.id,
        ip_address: getClientIP(request),
    });

    return created(data);
}
