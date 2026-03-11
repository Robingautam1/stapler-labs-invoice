import { NextResponse } from "next/server";

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: { code: string; message: string };
    meta?: { page?: number; limit?: number; total?: number };
}

export function success<T>(data: T, status = 200) {
    return NextResponse.json<ApiResponse<T>>(
        { success: true, data },
        { status }
    );
}

export function created<T>(data: T) {
    return success(data, 201);
}

export function paginated<T>(
    data: T[],
    meta: { page: number; limit: number; total: number }
) {
    return NextResponse.json<ApiResponse<T[]>>(
        { success: true, data, meta },
        { status: 200 }
    );
}

export function error(
    code: string,
    message: string,
    status = 400
) {
    return NextResponse.json<ApiResponse>(
        { success: false, error: { code, message } },
        { status }
    );
}

export function unauthorized(message = "Authentication required") {
    return error("UNAUTHORIZED", message, 401);
}

export function forbidden(message = "Insufficient permissions") {
    return error("FORBIDDEN", message, 403);
}

export function notFound(message = "Resource not found") {
    return error("NOT_FOUND", message, 404);
}

export function validationError(message: string) {
    return error("VALIDATION_ERROR", message, 422);
}

export function serverError(message = "Internal server error") {
    return error("SERVER_ERROR", message, 500);
}
