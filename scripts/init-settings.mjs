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
    console.log("Initializing system_settings table...");

    // We use a trick to create the table if it doesn't exist via RPC if possible, 
    // but since I don't have a broad exec_sql RPC usually, I will check if it exists by querying.
    // If it fails, I'll inform the user to run the SQL or try to use an existing exec_sql if I found one.

    // Check if we have 'exec_sql' RPC (some of my previous attempts used it)
    const { data: rpcCheck, error: rpcError } = await supabase.rpc('exec_sql', {
        sql: `
            CREATE TABLE IF NOT EXISTS public.system_settings (
                id TEXT PRIMARY KEY DEFAULT 'global',
                payment_alert_days INTEGER DEFAULT 5,
                policy_alert_days INTEGER DEFAULT 15,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            INSERT INTO public.system_settings (id, payment_alert_days, policy_alert_days)
            VALUES ('global', 5, 15)
            ON CONFLICT (id) DO NOTHING;
        `
    });

    if (rpcError) {
        console.error("Error creating table via RPC:", rpcError.message);
        console.log("Please run the following SQL in Supabase Dashboard:");
        console.log(`
            CREATE TABLE public.system_settings (
                id TEXT PRIMARY KEY DEFAULT 'global',
                payment_alert_days INTEGER DEFAULT 5,
                policy_alert_days INTEGER DEFAULT 15,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            INSERT INTO public.system_settings (id, payment_alert_days, policy_alert_days) VALUES ('global', 5, 15);
        `);
    } else {
        console.log("Table system_settings initialized successfully.");
    }
}

run();
