"use client";

import { useState } from "react";
import { ShieldCheck, Lock, User, Loader2, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.password,
            });

            if (error) {
                toast.error(error.message === "Invalid login credentials"
                    ? "Credenciales incorrectas"
                    : "Error: Acceso denegado"
                );
            } else {
                toast.success("Bienvenido al Portal de Gestión");
                // La redirección la maneja AuthProvider via onAuthStateChange
            }
        } catch (err) {
            toast.error("Error al conectar con el servidor");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px]" />
            </div>

            <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl shadow-slate-200/50 border border-slate-100 p-10 relative z-10">
                <div className="flex flex-col items-center mb-10">
                    <div className="bg-primary/10 p-5 rounded-[24px] mb-4 shadow-inner ring-4 ring-primary/5">
                        <ShieldCheck className="w-12 h-12 text-primary" />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight text-center">
                        Portal Gestión Pro
                    </h1>
                    <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] mt-2 border-b border-primary/20 pb-1">
                        La Segunda Seguros • Staff
                    </p>
                </div>

                <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl mb-8 flex items-start gap-3">
                    <div className="bg-amber-100 p-1.5 rounded-lg">
                        <Lock className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <p className="text-[10px] font-bold text-amber-800 leading-relaxed uppercase tracking-tight">
                        Acceso restringido. Solo personal administrativo autorizado con credenciales vigentes.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Usuario / E-mail</label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                required
                                type="email"
                                placeholder="admin@lasegunda.com"
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold text-slate-700 shadow-inner"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contraseña</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                required
                                type="password"
                                placeholder="••••••••"
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold text-slate-700 shadow-inner"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary text-white py-4 rounded-[22px] font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                Acceder al Dashboard
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </form>

                <p className="text-center mt-12 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                    Sistema de Gestión Administrativa
                    <br />© 2025 La Segunda Seguros.
                </p>
            </div>
        </div>
    );
}
