import { z } from "zod";

// ── Auth ──
export const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    full_name: z.string().min(1, "Full name is required"),
    role: z.enum(["admin", "staff", "client"]).optional().default("staff"),
});

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1, "Password is required"),
});

// ── Clients ──
export const clientSchema = z.object({
    company_name: z.string().min(1, "Company name is required"),
    gst_number: z.string().optional().nullable(),
    billing_address: z.string().optional().nullable(),
    shipping_address: z.string().optional().nullable(),
    contact_person: z.string().optional().nullable(),
    contact_email: z.string().email().optional().nullable(),
    contact_phone: z.string().optional().nullable(),
});

// ── Order Items ──
export const orderItemSchema = z.object({
    product_name: z.string().min(1, "Product name is required"),
    sku: z.string().optional().nullable(),
    quantity: z.number().int().positive(),
    unit_price: z.number().nonnegative(),
    tax_rate: z.number().nonnegative().default(0),
    discount_percent: z.number().nonnegative().max(100).default(0),
});

// ── Orders ──
export const createOrderSchema = z.object({
    client_id: z.string().uuid(),
    assigned_to: z.string().uuid().optional().nullable(),
    priority: z.enum(["normal", "urgent", "critical"]).default("normal"),
    estimated_delivery: z.string().optional().nullable(),
    internal_notes: z.string().optional().nullable(),
    discount_type: z.enum(["percent", "fixed"]).optional().nullable(),
    discount_value: z.number().nonnegative().default(0),
    tax_rate: z.number().nonnegative().default(18),
    items: z.array(orderItemSchema).min(1, "At least one item is required"),
});

export const updateOrderSchema = z.object({
    client_id: z.string().uuid().optional(),
    assigned_to: z.string().uuid().optional().nullable(),
    priority: z.enum(["normal", "urgent", "critical"]).optional(),
    estimated_delivery: z.string().optional().nullable(),
    internal_notes: z.string().optional().nullable(),
    discount_type: z.enum(["percent", "fixed"]).optional().nullable(),
    discount_value: z.number().nonnegative().optional(),
    tax_rate: z.number().nonnegative().optional(),
    items: z.array(orderItemSchema).optional(),
});

export const statusTransitionSchema = z.object({
    to_status: z.enum(["draft", "confirmed", "in_production", "dispatched", "delivered", "closed"]),
    notes: z.string().optional(),
});

// Valid status transitions
export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
    draft: ["confirmed"],
    confirmed: ["in_production", "draft"],
    in_production: ["dispatched", "confirmed"],
    dispatched: ["delivered"],
    delivered: ["closed"],
    closed: [],
};

// ── Invoice Items ──
export const invoiceItemSchema = z.object({
    description: z.string().min(1, "Description is required"),
    quantity: z.number().int().positive(),
    unit_price: z.number().nonnegative(),
    tax_rate: z.number().nonnegative().default(0),
});

// ── Invoices ──
export const createInvoiceSchema = z.object({
    order_id: z.string().uuid().optional().nullable(),
    client_id: z.string().uuid(),
    issue_date: z.string().optional(),
    due_date: z.string().optional(),
    notes: z.string().optional().nullable(),
    payment_terms: z.string().optional().nullable(),
    discount_type: z.enum(["percent", "fixed"]).optional().nullable(),
    discount_value: z.number().nonnegative().default(0),
    tax_rate: z.number().nonnegative().default(18),
    items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
});

export const updateInvoiceSchema = z.object({
    notes: z.string().optional().nullable(),
    payment_terms: z.string().optional().nullable(),
    due_date: z.string().optional(),
});

// ── Payments ──
export const paymentSchema = z.object({
    amount: z.number().positive("Amount must be positive"),
    method: z.enum(["upi", "bank_transfer", "cash", "cheque", "other"]).default("other"),
    reference_number: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    payment_date: z.string().optional(),
});

// ── Query Params ──
export const paginationSchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
});

export const orderFilterSchema = paginationSchema.extend({
    status: z.enum(["draft", "confirmed", "in_production", "dispatched", "delivered", "closed"]).optional(),
    priority: z.enum(["normal", "urgent", "critical"]).optional(),
    client_id: z.string().uuid().optional(),
    search: z.string().optional(),
});

export const invoiceFilterSchema = paginationSchema.extend({
    payment_status: z.enum(["unpaid", "partially_paid", "paid", "overdue"]).optional(),
    client_id: z.string().uuid().optional(),
    search: z.string().optional(),
});

// ── Utility ──
export function formatZodErrors(error: z.ZodError): string {
    return error.issues.map((i) => i.message).join(", ");
}

export function parseSearchParams(
    params: URLSearchParams,
    schema: z.ZodSchema
) {
    const obj: Record<string, string> = {};
    params.forEach((value, key) => {
        obj[key] = value;
    });
    return schema.safeParse(obj);
}

