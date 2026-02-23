// Script simple con fetch nativo para crear Super Admin via Supabase Admin API
const SUPABASE_URL = "https://decbevnmotgbtgtccfaw.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlY2Jldm5tb3RnYnRndGNjZmF3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTczMDIxOSwiZXhwIjoyMDg3MzA2MjE5fQ.uAzGZwYuGx09iT0AxG4aEa6kM5GlNIOzfpPK4c7_yVQ";

async function main() {
    console.log("🔐 Creando Super Admin via API REST...\n");

    // 1. Listar usuarios para ver si admin ya existe
    const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        headers: {
            "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
            "apikey": SERVICE_ROLE_KEY
        }
    });
    const listData = await listRes.json();
    const existing = listData.users?.find(u => u.email === "admin@admin.com");

    if (existing) {
        console.log("⚠️  Usuario existente encontrado. Eliminando...");
        await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${existing.id}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
                "apikey": SERVICE_ROLE_KEY
            }
        });
        console.log("🗑️  Eliminado.");
    }

    // 2. Crear usuario nuevo
    const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
            "apikey": SERVICE_ROLE_KEY,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email: "admin@admin.com",
            password: "123456",
            email_confirm: true,
            user_metadata: { full_name: "Super Admin" }
        })
    });

    const user = await createRes.json();

    if (!createRes.ok) {
        console.error("❌ Error:", JSON.stringify(user, null, 2));
        process.exit(1);
    }

    console.log("✅ Usuario creado:", user.id);
    console.log("   Email:", user.email);

    // 3. Crear perfil super_admin en la tabla pública
    const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
            "apikey": SERVICE_ROLE_KEY,
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates"
        },
        body: JSON.stringify({
            id: user.id,
            username: "admin@admin.com",
            full_name: "Super Admin",
            role: "super_admin",
            is_active: true
        })
    });

    if (profileRes.ok) {
        console.log("✅ Perfil Super Admin asignado correctamente.");
    } else {
        const err = await profileRes.text();
        console.log("⚠️  Perfil (puede existir ya):", err);
    }

    console.log("\n🚀 ¡Listo! Credenciales de acceso:");
    console.log("   Email:    admin@admin.com");
    console.log("   Password: 123456");
}

main().catch(e => { console.error(e); process.exit(1); });
