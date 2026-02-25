"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function createClientAction(data: any) {
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
        if (!isSuperAdmin && perms.clientes_crear !== true) {
            return { success: false, error: "No tienes permisos para crear clientes" };
        }

        const { full_name, dni, phone } = data;

        const { data: newClient, error } = await supabaseAdmin
            .from("clients")
            .insert([{ full_name, dni, phone }])
            .select()
            .single();

        if (error) {
            console.error("Supabase error:", error);
            return { success: false, error: error.message };
        }

        revalidatePath("/dashboard/clientes");
        revalidatePath("/dashboard/cobranzas");
        revalidatePath("/dashboard");

        return { success: true, data: newClient };
    } catch (err: any) {
        console.error("Action error:", err);
        return { success: false, error: err.message };
    }
}

export async function updateClientAction(id: string, data: any) {
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
        if (!isSuperAdmin && perms.clientes_editar !== true) {
            return { success: false, error: "No tienes permisos para editar clientes" };
        }

        const { full_name, dni, phone } = data;

        const { error } = await supabaseAdmin
            .from("clients")
            .update({ full_name, dni, phone })
            .eq("id", id);

        if (error) {
            console.error("Update error:", error);
            return { success: false, error: error.message };
        }

        revalidatePath("/dashboard/clientes");
        revalidatePath("/dashboard/cobranzas");
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function deleteClientAction(id: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "No autenticado" };

        // Verificar rol y permisos granulares
        const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("role, permissions")
            .eq("id", user.id)
            .single();

        const perms = (profile?.permissions as any) || {};
        const isSuperAdmin = profile?.role === "super_admin";
        const canDelete = isSuperAdmin || perms.clientes_eliminar === true;

        if (!canDelete) {
            return { success: false, error: "No tienes permisos para eliminar clientes" };
        }

        const { error } = await supabaseAdmin
            .from("clients")
            .update({ is_active: false })
            .eq("id", id);

        if (error) {
            console.error("Delete error:", error);
            return { success: false, error: error.message };
        }

        revalidatePath("/dashboard/clientes");
        revalidatePath("/dashboard/cobranzas");
        revalidatePath("/dashboard");
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function getClientsAction() {
    const { data, error } = await supabaseAdmin
        .from("clients")
        .select("*, payments(*)")
        .eq("is_active", true)
        .order("full_name", { ascending: true });

    if (error) return { success: false, error: error.message };
    return { success: true, data };
}
export async function getClientByIdAction(id: string) {
    const { data, error } = await supabaseAdmin
        .from("clients")
        .select("*, payments(*), policies(*, policy_installments(*))")
        .eq("id", id)
        .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
}
