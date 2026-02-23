"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check initial session once
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session && pathname.startsWith("/dashboard")) {
                router.replace("/login");
            }

            if (session && pathname === "/login") {
                router.replace("/dashboard");
            }

            setLoading(false);
        };

        checkUser();

        // Listen for auth changes (login/logout)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === "SIGNED_IN" && session) {
                // Solo redireccionar si estamos en login o raíz, para no interrumpir la navegación
                if (window.location.pathname === "/login" || window.location.pathname === "/") {
                    router.replace("/dashboard");
                }
            }
            if (event === "SIGNED_OUT") {
                window.location.href = "/login";
            }
        });

        return () => subscription.unsubscribe();
    }, [router]);

    if (loading && pathname.startsWith("/dashboard")) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-slate-50" suppressHydrationWarning>
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Validando Credenciales...</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
