"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function getSystemSettings() {
    try {
        const { data, error } = await supabaseAdmin
            .from("system_settings")
            .select("*")
            .eq("id", "global")
            .single();

        if (error) {
            // Si la tabla no existe o hay error, devolvemos valores por defecto
            console.error("Error fetching settings:", error.message);
            return {
                success: true,
                data: {
                    id: "global",
                    payment_alert_days: 5,
                    policy_alert_days: 15,
                    payment_message_template: 'Hola {nombre}! Te recordamos que el pago de tu cuota de {monto} vence el día {fecha}. Agencia La Segunda.',
                    policy_message_template: 'Hola {nombre}! Te recordamos que tu póliza N° {nro_poliza} de La Segunda Seguros está próxima a vencer el día {fecha}. ¿Deseas renovarla?'
                }
            };
        }

        return { success: true, data };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function updateSystemSettings(data: {
    payment_alert_days: number;
    policy_alert_days: number;
    payment_message_template?: string;
    policy_message_template?: string;
}) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "No autenticado" };

        const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (profile?.role !== "super_admin" && profile?.role !== "admin") {
            return { success: false, error: "Solo los administradores pueden cambiar la configuración" };
        }

        const { error } = await supabaseAdmin
            .from("system_settings")
            .upsert({
                id: "global",
                ...data,
                updated_at: new Date().toISOString()
            });

        if (error) {
            console.error("Update settings error:", error);
            return { success: false, error: error.message };
        }

        revalidatePath("/dashboard", "layout");
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
