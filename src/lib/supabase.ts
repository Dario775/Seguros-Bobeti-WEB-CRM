import { createClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Client-side Supabase (Browser Client con soporte para cookies SSR)
export const supabase = createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
);

// Server-side Admin Client (para server actions — usa SERVICE_ROLE_KEY)
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

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
