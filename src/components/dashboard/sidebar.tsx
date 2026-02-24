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
            // Intentar recuperar de cache primero para evitar esperas
            const cached = localStorage.getItem(`sb_profile_${userId}`);
            if (cached && !profile) {
                setProfile(JSON.parse(cached));
            }

            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", userId)
                .maybeSingle();

            if (data) {
                setProfile(data);
                localStorage.setItem(`sb_profile_${userId}`, JSON.stringify(data));

                if (data.is_active === false) {
                    await supabase.auth.signOut();
                    window.location.href = "/login";
                }
            } else if (error) {
                console.error("[Sidebar] Error al cargar perfil:", error);
                // Si falla pero ya teníamos cache, no hacemos nada (mantener cache)
                // Si no hay perfil, ponemos uno por defecto para no bloquear la UI
                if (!profile) {
                    setProfile({ role: 'viewer', full_name: 'Usuario' });
                }
            } else {
                // No hay datos (usuario nuevo sin perfil)
                setProfile({ role: 'viewer', full_name: 'Nuevo Integrante' });
            }
        } catch (err) {
            console.error("[Sidebar] Fetch catch:", err);
            if (!profile) setProfile({ role: 'viewer', full_name: 'Error Perfil' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let isMounted = true;

        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user && isMounted) {
                setUserEmail(session.user.email || null);
                await fetchProfile(session.user.id);
            } else if (isMounted) {
                setLoading(false);
            }
        };

        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!isMounted) return;

            console.log("[Sidebar] Auth Event:", event);
            if (session?.user) {
                setUserEmail(session.user.email || null);
                if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
                    await fetchProfile(session.user.id);
                }
            } else if (event === "SIGNED_OUT") {
                setProfile(null);
                setUserEmail(null);
                setLoading(false);
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

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
        <>
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex w-72 flex-shrink-0 glass-sidebar h-screen sticky top-0 flex flex-col border-r shadow-sm z-50">
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

            {/* Mobile Bottom Nav */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-200 px-2 py-2 flex items-center justify-around z-[100] pb-safe shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
                {filteredItems.map((item) => {
                    const isActive = pathname === item.path;
                    const Icon = item.icon;
                    const hasAlerts = item.label === "Dashboard" && alertCount > 0;

                    return (
                        <Link
                            key={item.path}
                            href={item.path}
                            className={cn(
                                "flex flex-col items-center gap-1 p-2 rounded-xl transition-all relative flex-1 max-w-[80px]",
                                isActive ? "text-primary scale-110" : "text-slate-400"
                            )}
                        >
                            <div className={cn(
                                "p-1 rounded-lg transition-colors",
                                isActive && "bg-primary/10"
                            )}>
                                <Icon className="w-5 h-5" />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-wider">{item.label}</span>
                            {hasAlerts && (
                                <span className="absolute top-1 right-2 flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                                </span>
                            )}
                        </Link>
                    );
                })}
                <button
                    onClick={handleLogout}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl text-rose-500 min-w-[64px]"
                >
                    <div className="p-1"><LogOut className="w-5 h-5" /></div>
                    <span className="text-[9px] font-black uppercase tracking-wider">Salir</span>
                </button>
            </nav>
        </>
    );
}
