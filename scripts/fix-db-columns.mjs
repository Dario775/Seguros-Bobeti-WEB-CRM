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
    console.log("Adding missing columns to system_settings...");

    // We try to add the column, it will error if it already exists but that's fine for a fix script.
    const { error: error1 } = await supabase.rpc('exec_sql', {
        sql: `ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS payment_message_template TEXT DEFAULT 'Hola {nombre}! Te recordamos que el pago de tu cuota de {monto} vence el día {fecha}. Agencia La Segunda.';`
    });

    const { error: error2 } = await supabase.rpc('exec_sql', {
        sql: `ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS policy_message_template TEXT DEFAULT 'Hola {nombre}! Te recordamos que tu póliza N° {nro_poliza} de La Segunda Seguros está próxima a vencer el día {fecha}. ¿Deseas renovarla?';`
    });

    if (error1 || error2) {
        console.log("RPC exec_sql failed or not found. PLEASE RUN THIS SQL IN SUPABASE DASHBOARD:");
        console.log(`
            ALTER TABLE public.system_settings 
            ADD COLUMN IF NOT EXISTS payment_message_template TEXT DEFAULT 'Hola {nombre}! Te recordamos que el pago de tu cuota de {monto} vence el día {fecha}. Agencia La Segunda.';
            
            ALTER TABLE public.system_settings 
            ADD COLUMN IF NOT EXISTS policy_message_template TEXT DEFAULT 'Hola {nombre}! Te recordamos que tu póliza N° {nro_poliza} de La Segunda Seguros está próxima a vencer el día {fecha}. ¿Deseas renovarla?';
            
            -- Actualizar caché de esquema (opcional, Supabase lo hace solo pero a veces tarda)
            NOTIFY pgrst, 'reload schema';
        `);
    } else {
        console.log("Columns added successfully via RPC.");
    }
}

run();
