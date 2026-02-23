import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Leer .env.local
const envContent = fs.readFileSync(".env.local", "utf8");
const env = {};
envContent.split("\n").forEach(line => {
    const [key, ...value] = line.split("=");
    if (key && value.length > 0) env[key.trim()] = value.join("=").trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function run() {
    // 1. Obtener póliza
    const { data: policies } = await supabaseAdmin.from('policies').select('*, clients(full_name)').eq('status', 'vigente').limit(1);
    if (!policies || policies.length === 0) {
        console.log("No hay pólizas vigentes.");
        return;
    }
    const p = policies[0];
    const clientId = p.client_id;
    const amount = p.monthly_amount;

    console.log(`Registrando pago CORRECTO ($${amount}) para cliente: ${p.clients.full_name}`);

    // 2. Insertar pago
    const { data: payment, error: pError } = await supabaseAdmin.from('payments').upsert({
        client_id: clientId,
        year: 2026,
        month: 2, // Mes de prueba
        amount: amount,
        status: 'paid',
        updated_at: new Date().toISOString()
    }).select().single();

    if (pError) {
        console.error("Error al insertar pago:", pError.message);
        return;
    }

    console.log("Pago insertado. ID:", payment.id);

    // 3. Esperar
    await new Promise(r => setTimeout(r, 1000));

    // 4. Buscar el log
    const { data: logs } = await supabaseAdmin
        .from('audit_logs')
        .select('*')
        .eq('table_name', 'payments')
        .eq('record_id', payment.id)
        .order('created_at', { ascending: false })
        .limit(1);

    if (logs && logs.length > 0) {
        console.log("LOG ENCONTRADO:", JSON.stringify(logs[0], null, 2));
    } else {
        console.log("LOG NO ENCONTRADO.");
    }
}

run();
