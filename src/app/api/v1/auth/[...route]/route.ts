import { createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";
import {
    success,
    created,
    error,
    unauthorized,
    validationError,
    serverError,
} from "@/lib/api/response";
import {
    authenticateRequest,
    isAuthUser,
} from "@/lib/api/auth-guard";
import { registerSchema, loginSchema } from "@/lib/api/validate";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ route: string[] }> }
) {
    const { route } = await params;
    const action = route?.[0];

    try {
        switch (action) {
            case "register":
                return await handleRegister(request);
            case "login":
                return await handleLogin(request);
            case "logout":
                return await handleLogout(request);
            default:
                return error("NOT_FOUND", `Unknown auth action: ${action}`, 404);
        }
    } catch (err) {
        console.error("Auth error:", err);
        return serverError();
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ route: string[] }> }
) {
    const { route } = await params;
    const action = route?.[0];

    try {
        switch (action) {
            case "me":
                return await handleMe(request);
            default:
                return error("NOT_FOUND", `Unknown auth action: ${action}`, 404);
        }
    } catch (err) {
        console.error("Auth error:", err);
        return serverError();
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ route: string[] }> }
) {
    const { route } = await params;
    const action = route?.[0];

    try {
        switch (action) {
            case "me":
                return await handleUpdateMe(request);
            default:
                return error("NOT_FOUND", `Unknown auth action: ${action}`, 404);
        }
    } catch (err) {
        console.error("Auth error:", err);
        return serverError();
    }
}

// ─── REGISTER ────────────────────────────────
async function handleRegister(request: NextRequest) {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
        return validationError(parsed.error.issues.map((e: { message: string }) => e.message).join(", "));
    }

    const { email, password, full_name, role } = parsed.data;
    const supabase = await createClient();

    const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { full_name, role },
        },
    });

    if (signUpError) {
        return error("SIGNUP_FAILED", signUpError.message, 400);
    }

    return created({
        user: {
            id: data.user?.id,
            email: data.user?.email,
            full_name,
            role,
        },
        session: data.session,
    });
}

// ─── LOGIN ───────────────────────────────────
async function handleLogin(request: NextRequest) {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
        return validationError(parsed.error.issues.map((e: { message: string }) => e.message).join(", "));
    }

    const { email, password } = parsed.data;
    const supabase = await createClient();

    const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (loginError) {
        return unauthorized("Invalid email or password");
    }

    // Get profile with role
    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();

    return success({
        user: {
            id: data.user.id,
            email: data.user.email,
            full_name: profile?.full_name,
            role: profile?.role,
        },
        session: {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_at: data.session.expires_at,
        },
    });
}

// ─── LOGOUT ──────────────────────────────────
async function handleLogout(request: NextRequest) {
    const authResult = await authenticateRequest(request);
    if (!isAuthUser(authResult)) return authResult;

    const supabase = await createClient();
    await supabase.auth.signOut();

    return success({ message: "Logged out successfully" });
}

// ─── ME (GET) ────────────────────────────────
async function handleMe(request: NextRequest) {
    const authResult = await authenticateRequest(request);
    if (!isAuthUser(authResult)) return authResult;

    const supabase = await createClient();
    const { data: profile } = await supabase
        .from("profiles")
        .select("*, clients:linked_client_id(*)")
        .eq("id", authResult.id)
        .single();

    return success(profile);
}

// ─── ME (PATCH) ──────────────────────────────
async function handleUpdateMe(request: NextRequest) {
    const authResult = await authenticateRequest(request);
    if (!isAuthUser(authResult)) return authResult;

    const body = await request.json();
    const allowedFields = ["full_name", "avatar_url"];
    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
        if (field in body) updates[field] = body[field];
    }

    if (Object.keys(updates).length === 0) {
        return validationError("No valid fields to update");
    }

    const supabase = await createClient();
    const { data, error: updateError } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", authResult.id)
        .select()
        .single();

    if (updateError) {
        return serverError(updateError.message);
    }

    return success(data);
}
