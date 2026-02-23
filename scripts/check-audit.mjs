import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Leer .env.local manualmente para evitar dependencias
const envContent = fs.readFileSync(".env.local", "utf8");
const env = {};
envContent.split("\n").forEach(line => {
    const [key, ...value] = line.split("=");
    if (key && value.length > 0) {
        env[key.trim()] = value.join("=").trim();
    }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error("Faltan variables de entorno en .env.local");
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function run() {
    try {
        const { data, error } = await supabaseAdmin.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(20);
        if (error) {
            console.error("DB Error:", error);
        } else {
            console.log("Total Logs Found:", data?.length || 0);
            if (data && data.length > 0) {
                console.log("Latest Log Entry:", JSON.stringify(data[0], null, 2));
            }

            // Verificar si hay logs de pagos
            const paymentLogs = data?.filter(l => l.table_name === 'payments');
            console.log("Payment Logs Count:", paymentLogs?.length || 0);
        }
    } catch (err) {
        console.error("Catch Error:", err);
    }
}

run();
