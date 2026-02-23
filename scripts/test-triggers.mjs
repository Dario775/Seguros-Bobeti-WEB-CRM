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
    // 1. Obtener un cliente y una póliza activa
    const { data: clients } = await supabaseAdmin.from('clients').select('id').limit(1);
    if (!clients || clients.length === 0) {
        console.log("No hay clientes.");
        return;
    }
    const clientId = clients[0].id;

    console.log("Registrando pago de prueba para cliente:", clientId);

    // 2. Insertar pago directly with admin (should trigger audit with user_id = null)
    const { data: payment, error: pError } = await supabaseAdmin.from('payments').upsert({
        client_id: clientId,
        year: 2026,
        month: 1,
        amount: 100,
        status: 'paid',
        updated_at: new Date().toISOString()
    }).select().single();

    if (pError) {
        console.error("Error al insertar pago:", pError.message);
        return;
    }

    console.log("Pago insertado. ID:", payment.id);

    // 3. Esperar un momento
    await new Promise(r => setTimeout(r, 1000));

    // 4. Buscar el log
    const { data: logs, error: lError } = await supabaseAdmin
        .from('audit_logs')
        .select('*')
        .eq('table_name', 'payments')
        .eq('record_id', payment.id)
        .order('created_at', { ascending: false })
        .limit(1);

    if (lError) {
        console.error("Error al buscar log:", lError.message);
    } else if (logs && logs.length > 0) {
        console.log("LOG ENCONTRADO:", JSON.stringify(logs[0], null, 2));
    } else {
        console.log("LOG NO ENCONTRADO.");
    }
}

run();
