import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Server-side Admin Client (para server actions — usa SERVICE_ROLE_KEY)
// Solo debe usarse en entornos de servidor
export const supabaseAdmin = createClient(
    supabaseUrl || "https://placeholder-project.supabase.co",
    serviceRoleKey || supabaseAnonKey || "placeholder-key",
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);
