import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Leer .env.local manualmente
const envContent = fs.readFileSync(".env.local", "utf8");
const env = {};
envContent.split("\n").forEach(line => {
    const [key, ...value] = line.split("=");
    if (key && value.length > 0) {
        env[key.trim()] = value.join("=").trim();
    }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

async function run() {
    console.log("--- Testing with Service Role ---");
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: adminData } = await admin.from('audit_logs').select('id').limit(1);
    console.log("Admin can see logs:", !!adminData && adminData.length > 0);

    console.log("\n--- Testing with Anon Key ---");
    const anon = createClient(supabaseUrl, anonKey);
    const { data: anonData, error: anonError } = await anon.from('audit_logs').select('id').limit(1);
    if (anonError) {
        console.error("Anon Error:", anonError.message);
    }
    console.log("Anon can see logs:", !!anonData && anonData.length > 0);
}

run();
