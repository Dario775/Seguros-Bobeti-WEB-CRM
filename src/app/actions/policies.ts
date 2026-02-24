"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { syncInstallmentToPayment } from "@/lib/sync-logic";

export async function createPolicyAction(data: any) {
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
        if (!isSuperAdmin && perms.polizas_crear !== true) {
            return { success: false, error: "No tienes permisos para crear pólizas" };
        }

        const {
            client_id,
            policy_number,
            type,
            dominio,
            start_date,
            monthly_amount,
            installments,
            notes,
        } = data;

        // Calcular end_date: start_date + N meses
        const startD = new Date(start_date);
        const endD = new Date(startD);
        endD.setMonth(endD.getMonth() + installments);
        const end_date = endD.toISOString().split("T")[0];

        // 1. Crear la póliza
        const { data: policy, error } = await supabaseAdmin
            .from("policies")
            .insert([{
                client_id,
                policy_number,
                type,
                dominio: dominio?.toUpperCase() || null,
                start_date,
                end_date,
                monthly_amount,
                installments,
                notes,
                status: "vigente",
            }])
            .select()
            .single();

        if (error) {
            console.error("Policy create error:", error);
            return { success: false, error: error.message };
        }

        // 2. Generar cuotas mensuales automáticamente (solo desde el mes actual en adelante)
        // 2. Generar cuotas mensuales automáticamente (solo desde el mes actual en adelante)
        const installmentRows = [];
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); // 0-11
        let firstInstallmentPaid = false;

        for (let i = 0; i < installments; i++) {
            const dueDate = new Date(startD);
            dueDate.setMonth(dueDate.getMonth() + i);

            const dueYear = dueDate.getFullYear();
            const dueMonth = dueDate.getMonth();

            if (dueYear < currentYear || (dueYear === currentYear && dueMonth < currentMonth)) {
                continue;
            }

            const isCurrentMonth = (dueYear === currentYear && dueMonth === currentMonth);

            installmentRows.push({
                policy_id: policy.id,
                number: i + 1,
                due_date: dueDate.toISOString().split("T")[0],
                amount: monthly_amount,
                status: isCurrentMonth ? "pagada" : "pendiente",
                paid_at: isCurrentMonth ? now.toISOString() : null
            });

            if (isCurrentMonth) firstInstallmentPaid = true;
        }

        const { error: instError } = await supabaseAdmin
            .from("policy_installments")
            .insert(installmentRows);

        if (instError) {
            console.error("Installments create error:", instError);
            await supabaseAdmin.from("policies").delete().eq("id", policy.id);
            return { success: false, error: instError.message };
        }

        // 3. Impactar primer pago en la Matriz de Cobranzas
        if (firstInstallmentPaid) {
            await syncInstallmentToPayment(client_id, start_date, monthly_amount);
        }

        revalidatePath("/dashboard/asegurar");
        revalidatePath("/dashboard/cobranzas");
        return { success: true, data: policy };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function getPoliciesAction() {
    try {
        const { data, error } = await supabaseAdmin
            .from("policies")
            .select("*, client:clients(id, full_name, dni), policy_installments(*)")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("getPolicies error:", error);
            return { success: true, data: [] };
        }
        return { success: true, data };
    } catch (err: any) {
        console.error("getPolicies catch:", err);
        return { success: true, data: [] };
    }
}

export async function deletePolicyAction(id: string) {
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
        if (!isSuperAdmin && perms.polizas_eliminar !== true) {
            return { success: false, error: "No tienes permisos para eliminar pólizas" };
        }

        // 1. Obtener información de la póliza antes de borrarla
        const { data: policy } = await supabaseAdmin
            .from("policies")
            .select("client_id")
            .eq("id", id)
            .single();

        if (policy) {
            // 2. Borrar pagos asociados en la matriz de cobranzas para este cliente
            // Decisión: Borrar todo rastro de esa póliza en cobranzas si se elimina la póliza.
            await supabaseAdmin
                .from("payments")
                .delete()
                .eq("client_id", policy.client_id);
        }

        const { error } = await supabaseAdmin.from("policies").delete().eq("id", id);
        if (error) return { success: false, error: error.message };

        revalidatePath("/dashboard/asegurar");
        revalidatePath("/dashboard/cobranzas");
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function payInstallmentAction(id: string) {
    try {
        const now = new Date();
        const supabase = await createClient();
        // 0. Verificar permisos
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "No autenticado" };

        const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("role, permissions")
            .eq("id", user.id)
            .single();

        const perms = (profile?.permissions as any) || {};
        const canEdit = profile?.role === "super_admin" || profile?.role === "admin" || perms.pagos_editar === true;

        if (!canEdit) {
            return { success: false, error: "No tienes permisos para registrar pagos" };
        }

        // 1. Obtener detalles de la cuota y el cliente
        const { data: installment, error: fetchErr } = await supabaseAdmin
            .from("policy_installments")
            .select("due_date, amount, policies(client_id)")
            .eq("id", id)
            .single();

        if (fetchErr || !installment) return { success: false, error: "Cuota no encontrada" };

        const client_id = (installment.policies as any).client_id;

        // 2. Marcar cuota como pagada
        const { error: updateErr } = await supabaseAdmin
            .from("policy_installments")
            .update({ status: "pagada", paid_at: now.toISOString() })
            .eq("id", id);

        if (updateErr) return { success: false, error: updateErr.message };

        // 3. Impactar en la Matriz de Cobranzas (Sincronización Total Centralizada)
        await syncInstallmentToPayment(client_id, installment.due_date, installment.amount);

        revalidatePath("/dashboard/asegurar");
        revalidatePath("/dashboard/cobranzas");
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function updatePolicyStatusesAction() {
    try {
        // Obtener configuración de alertas
        const { data: settings } = await supabaseAdmin
            .from("system_settings")
            .select("policy_alert_days")
            .eq("id", "global")
            .single();

        const policyDays = settings?.policy_alert_days || 30;

        const today = new Date().toISOString().split("T")[0];
        const limitDateObj = new Date();
        limitDateObj.setDate(limitDateObj.getDate() + policyDays);
        const futureDate = limitDateObj.toISOString().split("T")[0];

        // Optimización: Solo actualizar si el estado actual es diferente al objetivo
        await supabaseAdmin.from("policies").update({ status: "vencida" }).lt("end_date", today).neq("status", "cancelada").neq("status", "vencida");
        await supabaseAdmin.from("policies").update({ status: "por_vencer" }).gte("end_date", today).lte("end_date", futureDate).neq("status", "cancelada").neq("status", "por_vencer");
        await supabaseAdmin.from("policies").update({ status: "vigente" }).gt("end_date", futureDate).neq("status", "cancelada").neq("status", "vigente");
        await supabaseAdmin.from("policy_installments").update({ status: "vencida" }).lt("due_date", today).eq("status", "pendiente");

        revalidatePath("/dashboard/asegurar");
    } catch (err) {
        console.error("updatePolicyStatuses error:", err);
    }
    return { success: true };
}

// Obtener pólizas que vencen según la configuración del sistema
export async function getExpiringPoliciesAction() {
    try {
        // Obtener configuración de alertas
        const { data: settings } = await supabaseAdmin
            .from("system_settings")
            .select("policy_alert_days")
            .eq("id", "global")
            .single();

        const alertDays = settings?.policy_alert_days || 15;

        const today = new Date().toISOString().split("T")[0];
        const limitDateObj = new Date();
        limitDateObj.setDate(limitDateObj.getDate() + alertDays);
        const futureLimit = limitDateObj.toISOString().split("T")[0];

        const { data, error } = await supabaseAdmin
            .from("policies")
            .select("*, clients(full_name, phone, dni)")
            .gte("end_date", today)
            .lte("end_date", futureLimit)
            .neq("status", "cancelada")
            .order("end_date", { ascending: true });

        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (err: any) {
        console.error("getExpiringPolicies error:", err);
        return { success: false, error: err.message, data: [] };
    }
}
