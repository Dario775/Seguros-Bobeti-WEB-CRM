import { z } from "zod";

export const PaymentStatusEnum = z.enum(["paid", "pending", "overdue", "not_applicable"]);

export const ClientSchema = z.object({
    id: z.string().uuid().optional(),
    full_name: z.string().min(3, "Nombre completo requerido"),
    dni: z.string().min(1, "DNI requerido"),
    phone: z.string().optional(),
    is_active: z.boolean().default(true),
    created_at: z.string().datetime().optional(),
});

export const PaymentSchema = z.object({
    id: z.string().uuid().optional(),
    client_id: z.string().uuid(),
    year: z.number().int().min(2024),
    month: z.number().int().min(1).max(12),
    amount: z.number().positive(),
    status: PaymentStatusEnum,
    paid_at: z.string().datetime().nullable().optional(),
});

export type Client = z.infer<typeof ClientSchema>;
export type Payment = z.infer<typeof PaymentSchema>;

export type ServerActionResult<T> =
    | { success: true; data: T }
    | { success: false; error: string };
