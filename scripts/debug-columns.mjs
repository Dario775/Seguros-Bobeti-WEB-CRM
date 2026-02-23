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
    console.log("Checking columns of 'system_settings'...");

    // Attempt to select 'global' and see what we get
    const { data, error } = await supabase.from('system_settings').select('*').eq('id', 'global').single();

    if (error) {
        console.error("Error fetching settings:", error.message);
        console.error("Full error:", JSON.stringify(error, null, 2));
    } else {
        console.log("Data fetched successfully:");
        console.log(JSON.stringify(data, null, 2));
        console.log("Columns present:", Object.keys(data));
    }
}

run();
