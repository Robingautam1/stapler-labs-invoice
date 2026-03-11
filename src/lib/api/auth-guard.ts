import { createClient } from "@/lib/supabase/server";
import { unauthorized, forbidden } from "@/lib/api/response";
import { NextRequest } from "next/server";

export type UserRole = "admin" | "staff" | "client";

export interface AuthUser {
    id: string;
    email: string;
    role: UserRole;
    full_name: string;
}

/**
 * Authenticate the request and optionally check role.
 * Returns the AuthUser or a NextResponse error.
 */
export async function authenticateRequest(
    _request: NextRequest,
    requiredRoles?: UserRole[]
): Promise<AuthUser | Response> {
    const supabase = await createClient();

    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error || !user) {
        return unauthorized();
    }

    // Fetch profile with role
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .eq("id", user.id)
        .single();

    if (profileError || !profile) {
        return unauthorized("User profile not found");
    }

    const authUser: AuthUser = {
        id: profile.id,
        email: profile.email,
        role: profile.role as UserRole,
        full_name: profile.full_name,
    };

    // Check role if required
    if (requiredRoles && requiredRoles.length > 0) {
        if (!requiredRoles.includes(authUser.role)) {
            return forbidden(
                `This action requires one of these roles: ${requiredRoles.join(", ")}`
            );
        }
    }

    return authUser;
}

/**
 * Check if the result is an AuthUser (not an error Response).
 */
export function isAuthUser(result: AuthUser | Response): result is AuthUser {
    return "id" in result && "role" in result;
}

/**
 * Helper: get client IP from request headers
 */
export function getClientIP(request: NextRequest): string {
    return (
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        "unknown"
    );
}
