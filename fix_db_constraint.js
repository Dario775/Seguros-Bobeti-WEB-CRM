import { supabaseAdmin } from "./src/lib/supabase.ts";

async function fixConstraint() {
    console.log("Fixing profiles_role_check constraint...");

    const sql = `
        ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('super_admin', 'admin', 'cobrador', 'viewer'));
    `;

    // Since I don't have direct SQL execution, I have to rely on the user running this or using a tool if available.
    // I can't run RAW SQL through supabaseAdmin easily without an RPC.

    console.log("Please run the following SQL in your Supabase Dashboard SQL Editor:");
    console.log(sql);
}

fixConstraint();
