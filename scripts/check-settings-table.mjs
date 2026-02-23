import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envContent = fs.readFileSync(".env.local", "utf8");
const env = {};
envContent.split("\n").forEach(line => {
    const [key, ...value] = line.split("=");
    if (key && value.length > 0) env[key.trim()] = value.join("=").trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
    console.log("Attempting to initialize system_settings via direct SQL if possible...");

    // Some Supabase setups have an 'auth' or 'public' RPC for this, 
    // but if not, we might need the user to run it.
    // However, I can try to 'upsert' to a non-existent table to see the exact error.

    const { error } = await supabase.from('system_settings').upsert({ id: 'global', payment_alert_days: 5, policy_alert_days: 15 });

    if (error && error.code === '42P01') { // undefined_table
        console.error("TABLE DOES NOT EXIST. PLEASE RUN THIS SQL IN SUPABASE DASHBOARD:");
        console.log(`
            CREATE TABLE public.system_settings (
                id TEXT PRIMARY KEY DEFAULT 'global',
                payment_alert_days INTEGER DEFAULT 5,
                policy_alert_days INTEGER DEFAULT 15,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            INSERT INTO public.system_settings (id, payment_alert_days, policy_alert_days) VALUES ('global', 5, 15);
            
            -- Habilitar RLS
            ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
            
            -- Política para que todos puedan leer
            CREATE POLICY "Allow public read" ON public.system_settings FOR SELECT USING (true);
            
            -- Política para que solo admin pueda editar
            CREATE POLICY "Allow admin update" ON public.system_settings FOR ALL 
            USING (auth.jwt() ->> 'role' = 'service_role' OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
        `);
    } else if (error) {
        console.error("Other error:", error);
    } else {
        console.log("Table exists and was updated.");
    }
}

run();
