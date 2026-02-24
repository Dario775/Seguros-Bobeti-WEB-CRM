"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server"; // Use the server client for auth awareness
import { revalidatePath } from "next/cache";
import { syncPaymentToInstallment } from "@/lib/sync-logic";
import { cookies } from "next/headers";

// Registrar o actualizar un pago (upsert por client_id + year + month)
export async function registerPayment(data: {
    client_id: string;
    year: number;
    month: number;
    amount: number;
    status: "paid" | "pending" | "overdue" | "not_applicable";
}) {
    try {
        const { client_id, year, month, amount, status } = data;
        const supabase = await createClient(); // Para chequear auth

        // 1. Validar sesión
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (!user) {
            console.error("Auth check failed in registerPayment:", authError);
            return {
                success: false,
                error: `Error de Autenticación: Sesión no encontrada o expirada. Por favor, cierre sesión y vuelva a ingresar.`
            };
        }

        // 2. Obtener rol y permisos usando Admin para evitar problemas de RLS en perfiles
        const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("role, permissions")
            .eq("id", user.id)
            .single();

        if (!profile) return { success: false, error: "Perfil de usuario no encontrado" };

        const perms = (profile?.permissions as any) || {};
        const isSuperAdmin = profile?.role === "super_admin";
        if (!isSuperAdmin && perms.pagos_editar !== true) {
            return { success: false, error: "No tienes permisos para registrar o editar pagos" };
        }

        // 3. Ejecutar Upsert usando el cliente del usuario
        // Ahora que tenemos el middleware funcionando, la sesión de cookies debería
        // persistir correctamente y permitir el RLS si está bien configurado.

        const { data: payment, error } = await supabaseAdmin
            .from("payments")
            .upsert(
                {
                    client_id,
                    year,
                    month,
                    amount,
                    status,
                    paid_at: status === "paid" ? new Date().toISOString() : null,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: "client_id,year,month" }
            )
            .select()
            .single();

        if (error) {
            console.error("Payment upsert error:", error);
            // El trigger puede devolver mensajes de error personalizados
            if (error.message.includes("Operación no permitida") || error.message.includes("Monto inválido")) {
                return { success: false, error: "🚫 " + error.message };
            }
            return { success: false, error: "Error en base de datos: " + error.message };
        }

        // 4. Sincronizar con la cuota de la póliza
        if (status === "paid") {
            await syncPaymentToInstallment(client_id, year, month, status);
        }

        revalidatePath("/dashboard", "layout");
        return { success: true, data: payment };
    } catch (err: any) {
        console.error("Payment action error:", err);
        return { success: false, error: err.message };
    }
}

// Obtener todos los pagos de un año
export async function getPaymentsByYear(year: number) {
    const { data, error } = await supabaseAdmin
        .from("payments")
        .select("*")
        .eq("year", year)
        .order("month", { ascending: true });

    if (error) return { success: false, error: error.message };
    return { success: true, data };
}

// Marcar como vencidos los pagos pendientes de meses anteriores al actual
export async function markOverduePayments() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "No autenticado" };

        const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("role, permissions")
            .eq("id", user.id)
            .single();

        const perms = (profile?.permissions as any) || {};
        const isSuperAdmin = profile?.role === "super_admin";
        const isAdmin = profile?.role === "admin";
        const canEditPagos = isSuperAdmin || isAdmin || perms.pagos_editar === true;

        if (!canEditPagos) {
            return { success: false, error: "Permisos insuficientes para realizar esta operación masiva" };
        }

        const now = new Date();
        const currentMonth = now.getMonth() + 1; // 1-12
        const currentYear = now.getFullYear();

        const { data, error } = await supabaseAdmin
            .from("payments")
            .update({ status: "overdue", updated_at: new Date().toISOString() })
            .eq("status", "pending")
            .eq("year", currentYear)
            .lt("month", currentMonth)
            .select();

        if (error) {
            console.error("Mark overdue error:", error);
            return { success: false, error: error.message };
        }

        revalidatePath("/dashboard/cobranzas");
        revalidatePath("/dashboard");
        return { success: true, count: data?.length || 0 };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

// Obtener resumen para dashboard
export async function getDashboardStats(month?: number, year?: number) {
    try {
        // 1. Obtener estadísticas base desde la función RPC (Mucho más rápido y eficiente)
        // Pasamos mes y año opcionalmente
        const { data: rpcStats, error: rpcError } = await supabaseAdmin.rpc("get_dashboard_stats", {
            p_month: month || null,
            p_year: year || null
        });

        if (rpcError) throw rpcError;

        // 2. Obtener movimientos del periodo (Si se especifica mes/año, traemos todos para que sirva de detalle)
        // Si no se especifica, traemos los últimos 5 globales
        let query = supabaseAdmin
            .from("payments")
            .select(`*, clients (full_name, dni)`)
            .order("updated_at", { ascending: false });

        if (month && year) {
            query = query.eq("month", month).eq("year", year);
        } else {
            query = query.limit(5);
        }

        const { data: recentPayments } = await query;

        return {
            success: true,
            data: {
                ...rpcStats,
                recentPayments: recentPayments || []
            }
        };
    } catch (err: any) {
        console.error("Dashboard stats error:", err);
        return { success: false, error: err.message };
    }
}

// Obtener reporte detallado de un mes específico
export async function getMonthlyReportAction(month: number, year: number) {
    try {
        // 1. Pagos del mes/año
        const { data: payments, error: pError } = await supabaseAdmin
            .from("payments")
            .select(`*, clients (full_name, dni, phone)`)
            .eq("year", year)
            .eq("month", month);

        if (pError) throw pError;

        // 2. Resumen financiero
        const totalCollected = (payments || [])
            .filter(p => p.status === "paid")
            .reduce((acc, p) => acc + parseFloat(p.amount), 0);

        const totalPending = (payments || [])
            .filter(p => p.status === "pending" || p.status === "overdue")
            .reduce((acc, p) => acc + parseFloat(p.amount), 0);

        const countPaid = payments?.filter(p => p.status === "paid").length || 0;
        const countUnpaid = payments?.filter(p => p.status !== "paid").length || 0;

        // 3. Distribución por tipo de póliza
        const { data: policies } = await supabaseAdmin
            .from("policies")
            .select("type, monthly_amount");

        const byType: Record<string, number> = {};
        (policies || []).forEach(p => {
            byType[p.type] = (byType[p.type] || 0) + 1;
        });

        return {
            success: true,
            data: {
                payments: payments || [],
                summary: {
                    totalCollected,
                    totalPending,
                    countPaid,
                    countUnpaid,
                    totalTransactions: payments?.length || 0
                },
                byType
            }
        };
    } catch (err: any) {
        console.error("Monthly report error:", err);
        return { success: false, error: err.message };
    }
}

// Obtener cuotas próximas a vencer según configuración
export async function getUpcomingPaymentsAction() {
    try {
        const { data: settings } = await supabaseAdmin
            .from("system_settings")
            .select("payment_alert_days")
            .eq("id", "global")
            .single();

        const alertDays = settings?.payment_alert_days || 5;

        const today = new Date().toISOString().split("T")[0];
        const futureLimitObj = new Date();
        futureLimitObj.setDate(futureLimitObj.getDate() + alertDays);
        const futureLimit = futureLimitObj.toISOString().split("T")[0];

        const { data, error } = await supabaseAdmin
            .from("policy_installments")
            .select("*, policies(policy_number, type, client_id, clients(full_name, phone))")
            .eq("status", "pendiente")
            .gte("due_date", today)
            .lte("due_date", futureLimit)
            .order("due_date", { ascending: true });

        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (err: any) {
        console.error("getUpcomingPayments error:", err);
        return { success: false, error: err.message, data: [] };
    }
}
