"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    BarChart3,
    Users,
    TableProperties,
    Settings,
    LogOut,
    ShieldCheck,
    ShieldPlus,
    ShieldAlert,
    UserCog,
    RefreshCw,
    Bell
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { getExpiringPoliciesAction } from "@/app/actions/policies";

const menuItems = [
    { label: "Dashboard", icon: BarChart3, path: "/dashboard" },
    { label: "Clientes", icon: Users, path: "/dashboard/clientes" },
    { label: "Asegurar", icon: ShieldPlus, path: "/dashboard/asegurar" },
    { label: "Cobranzas", icon: TableProperties, path: "/dashboard/cobranzas" },
    { label: "Configuración", icon: Settings, path: "/dashboard/configuracion" },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async (userId: string) => {
        try {
            // No ponemos loading(true) aquí para evitar el parpadeo si ya tenemos datos
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", userId)
                .maybeSingle();

            if (error) {
                console.error("[Sidebar] Profile error:", error);
            } else if (data) {
                setProfile(data);
                // Guardar en cache local para recuperaciones instantáneas
                localStorage.setItem(`sb_profile_${userId}`, JSON.stringify(data));

                if (data.is_active === false) {
                    await supabase.auth.signOut();
                    router.push("/login");
                }
            } else {
                setProfile({ role: 'viewer', full_name: 'Usuario sin Perfil' });
            }
        } catch (err) {
            console.error("[Sidebar] Fetch crash:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let isMounted = true;
        let isSyncing = false;

        const syncAuth = async () => {
            if (isSyncing) return;
            isSyncing = true;
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user && isMounted) {
                    setUserEmail(session.user.email || null);

                    // INTENTO DE RECUPERACIÓN FLASH (CACHE)
                    const cached = localStorage.getItem(`sb_profile_${session.user.id}`);
                    if (cached && !profile) {
                        setProfile(JSON.parse(cached));
                        setLoading(false);
                    }

                    await fetchProfile(session.user.id);
                } else if (isMounted) {
                    setLoading(false);
                }
            } catch (e) {
                console.error("[Sidebar] Auth sync error:", e);
                if (isMounted) setLoading(false);
            } finally {
                isSyncing = false;
            }
        };

        syncAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
            console.log("[Sidebar] Auth Event:", event);
            if (session?.user && isMounted) {
                setUserEmail(session.user.email || null);
                // Only re-fetch if we don't have a profile or session changed
                await fetchProfile(session.user.id);
            } else if (isMounted && (event === 'SIGNED_OUT' || !session)) {
                setProfile(null);
                setUserEmail(null);
                setLoading(false);
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [router]);

    const handleLogout = async () => {
        try {
            // Limpiar cache local de perfiles de forma proactiva
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('sb_profile_')) {
                    localStorage.removeItem(key);
                }
            });

            await supabase.auth.signOut();
            // El AuthProvider debería detectar el evento SIGNED_OUT y redirigir
            // pero lo reforzamos aquí con un hard redirect
            window.location.href = "/login";
        } catch (error) {
            console.error("Error logging out:", error);
            window.location.href = "/login";
        }
    };

    const [alertCount, setAlertCount] = useState(0);

    const fetchAlertCount = async () => {
        const result = await getExpiringPoliciesAction();
        if (result.success) setAlertCount(result.data.length);
    };

    useEffect(() => {
        fetchAlertCount();
        const interval = setInterval(fetchAlertCount, 1000 * 60 * 10); // Refresh cada 10 mins
        return () => clearInterval(interval);
    }, []);

    const role = profile?.role || "viewer";
    const perms = profile?.permissions || { dashboard: true, clientes: true, asegurar: true, cobranzas: true };

    const filteredItems = menuItems.filter(item => {
        // DEFCON 1: Super Admin is God
        if (role === "super_admin") return true;

        // Permission based filtering
        if (item.label === "Dashboard") return perms.dashboard !== false;
        if (item.label === "Clientes") return perms.clientes !== false;
        if (item.label === "Asegurar") return perms.asegurar !== false;
        if (item.label === "Cobranzas") return perms.cobranzas !== false;

        // Admin restricted sections
        if (item.label === "Configuración") {
            return role === "admin" || role === "super_admin";
        }

        return true;
    });

    return (
        <aside className="w-72 flex-shrink-0 glass-sidebar h-screen sticky top-0 flex flex-col border-r shadow-sm z-50">
            <div className="p-8 pb-4">
                <div className="flex items-center gap-3 px-2 mb-8">
                    <div className="bg-primary p-2 rounded-xl shadow-lg shadow-primary/30">
                        <ShieldCheck className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-slate-900 leading-tight">Gestión Pro</h1>
                        <p className="text-[10px] text-primary font-black uppercase tracking-widest">La Segunda Seguros</p>
                    </div>
                </div>

                <nav className="space-y-1.5">
                    {loading ? (
                        <div className="p-4 space-y-4">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        filteredItems.map((item) => {
                            const isActive = pathname === item.path;
                            const hasAlerts = item.label === "Dashboard" && alertCount > 0;
                            return (
                                <Link
                                    key={item.path}
                                    href={item.path}
                                    className={cn(
                                        "flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl transition-all group font-bold text-sm",
                                        isActive
                                            ? "bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]"
                                            : "text-slate-500 hover:bg-slate-100/50 hover:text-slate-900"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <item.icon className={cn(
                                            "w-5 h-5",
                                            isActive ? "text-white" : "text-slate-400 group-hover:text-primary transition-colors"
                                        )} />
                                        {item.label}
                                    </div>
                                    {hasAlerts && (
                                        <span className={cn(
                                            "flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black animate-pulse",
                                            isActive ? "bg-white text-primary" : "bg-rose-500 text-white shadow-lg shadow-rose-500/30"
                                        )}>
                                            {alertCount}
                                        </span>
                                    )}
                                </Link>
                            );
                        })
                    )}
                </nav>
            </div>

            <div className="mt-auto p-8 pt-4 space-y-4">
                <div className="bg-slate-100/50 p-4 rounded-3xl border border-slate-200/50 group/profile relative">
                    <button
                        onClick={async () => {
                            const { data: { session } } = await supabase.auth.getSession();
                            if (session?.user) fetchProfile(session.user.id);
                        }}
                        className="absolute -top-2 -right-2 p-1.5 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-primary hover:shadow-md transition-all opacity-0 group-hover/profile:opacity-100 z-10"
                        title="Refrescar Perfil"
                    >
                        <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
                    </button>
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm font-black text-primary uppercase">
                            {profile?.full_name?.charAt(0) || <UserCog className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-black text-slate-900 leading-none mb-1 truncate">
                                {profile?.full_name || "Cargando..."}
                            </p>
                            <p className="text-[9px] text-slate-500 truncate lowercase mb-1 opacity-70">
                                {userEmail || "anonimo"}
                            </p>
                            <div className="flex items-center gap-1.5">
                                <span className={cn(
                                    "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter",
                                    role === 'super_admin' ? "bg-purple-100 text-purple-700" :
                                        role === 'admin' ? "bg-blue-100 text-blue-700" :
                                            role === 'cobrador' ? "bg-emerald-100 text-emerald-700" :
                                                "bg-slate-200 text-slate-600"
                                )}>
                                    {role.replace('_', ' ')}
                                </span>
                                {!profile?.id && !loading && (
                                    <ShieldAlert className="w-3 h-3 text-rose-500 animate-pulse" />
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm text-rose-500 hover:bg-rose-50 w-full"
                >
                    <LogOut className="w-5 h-5" />
                    Cerrar Sesión
                </button>
            </div>
        </aside>
    );
}
