"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function createUserAction(data: any) {
    try {
        const supabase = await createClient();
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) return { success: false, error: "No autenticado" };

        const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("role, permissions")
            .eq("id", currentUser.id)
            .single();

        const perms = (profile?.permissions as any) || {};
        const isSuperAdmin = profile?.role === "super_admin";
        if (!isSuperAdmin && perms.usuarios_gestionar !== true) {
            return { success: false, error: "No tienes permisos para gestionar usuarios" };
        }

        const { email, password, full_name, role, permissions } = data;

        // 1. Create the user in Supabase Auth
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name }
        });

        if (authError) {
            console.error("Auth Admin Error:", authError);
            return { success: false, error: authError.message };
        }

        // 2. Create/Update the profile with the assigned role
        const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .upsert({
                id: authUser.user.id,
                full_name,
                role,
                permissions,
                username: email,
                updated_at: new Date().toISOString()
            });

        if (profileError) {
            console.error("Profile Error:", profileError);
            return { success: false, error: "Usuario creado pero falló el perfil: " + profileError.message };
        }

        revalidatePath("/dashboard/configuracion");
        return { success: true };
    } catch (err: any) {
        console.error("Unexpected Error:", err);
        return { success: false, error: err.message };
    }
}

// Obtener lista de staff (perfiles)
export async function getStaffAction() {
    const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .order("role", { ascending: true });

    if (error) return { success: false, error: error.message };
    return { success: true, data };
}

// Actualizar usuario (rol, permisos, estado)
export async function updateUserAction(userId: string, updates: {
    role?: string;
    permissions?: Record<string, boolean>;
    is_active?: boolean;
    full_name?: string;
}) {
    try {
        const supabase = await createClient();
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) return { success: false, error: "No autenticado" };

        const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("role, permissions")
            .eq("id", currentUser.id)
            .single();

        const perms = (profile?.permissions as any) || {};
        const isSuperAdmin = profile?.role === "super_admin";
        if (!isSuperAdmin && perms.usuarios_gestionar !== true) {
            return { success: false, error: "No tienes permisos para gestionar usuarios" };
        }

        const { error } = await supabaseAdmin
            .from("profiles")
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq("id", userId);

        if (error) {
            console.error("Update user error:", error);
            return { success: false, error: error.message };
        }

        revalidatePath("/dashboard/configuracion");
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
