"use client";

import { useState, useEffect, use } from "react";
import Sidebar from "@/components/dashboard/sidebar";
import {
    User,
    IdCard,
    Phone,
    Shield,
    FileText,
    Calendar,
    ChevronLeft,
    CheckCircle,
    Clock,
    AlertTriangle,
    Plus,
    Loader2,
    DollarSign,
    Car,
    Home,
    Heart,
    Store,
    HelpCircle
} from "lucide-react";
import Link from "next/link";
import { cn, formatCurrency } from "@/lib/utils";
import { getClientByIdAction } from "@/app/actions/clients";
import { toast } from "sonner";

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
    auto: { label: "Automotor", icon: Car, color: "text-blue-600", bg: "bg-blue-50" },
    hogar: { label: "Hogar", icon: Home, color: "text-violet-600", bg: "bg-violet-50" },
    vida: { label: "Vida", icon: Heart, color: "text-rose-600", bg: "bg-rose-50" },
    comercio: { label: "Comercio", icon: Store, color: "text-amber-600", bg: "bg-amber-50" },
    otro: { label: "Otro", icon: HelpCircle, color: "text-slate-600", bg: "bg-slate-50" },
};

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [client, setClient] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchClient = async () => {
        setLoading(true);
        const result = await getClientByIdAction(id);
        if (result.success) setClient(result.data);
        else toast.error("Error al cargar el cliente");
        setLoading(false);
    };

    useEffect(() => { fetchClient(); }, [id]);

    const formatDate = (d: string) => {
        if (!d) return "—";
        return new Date(d + "T00:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
    };

    if (loading) {
        return (
            <div className="flex min-h-screen bg-slate-50/50">
                <Sidebar />
                <main className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                </main>
            </div>
        );
    }

    if (!client) {
        return (
            <div className="flex min-h-screen bg-slate-50/50">
                <Sidebar />
                <main className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-400">
                    <User className="w-16 h-16 opacity-20" />
                    <p className="font-bold">Cliente no encontrado</p>
                    <Link href="/dashboard/clientes" className="text-primary font-black uppercase text-xs tracking-widest hover:underline">
                        Volver al listado
                    </Link>
                </main>
            </div>
        );
    }

    const activePolicies = client.policies?.filter((p: any) => p.status === "vigente" || p.status === "por_vencer") || [];
    const totalMonthly = activePolicies.reduce((acc: number, p: any) => acc + parseFloat(p.monthly_amount), 0);

    return (
        <div className="flex min-h-screen bg-slate-50/50">
            <Sidebar />
            <main className="flex-1 p-8">
                <header className="mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard/clientes" className="p-2 hover:bg-white border border-slate-200 rounded-xl transition-all text-slate-400 hover:text-primary">
                            <ChevronLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h2 className="text-3xl font-black tracking-tight uppercase flex items-center gap-3">
                                {client.full_name}
                            </h2>
                            <p className="text-muted-foreground font-medium flex items-center gap-4 text-xs uppercase tracking-widest mt-1">
                                <span className="flex items-center gap-1"><IdCard className="w-3.5 h-3.5" /> DNI {client.dni}</span>
                                {client.phone && <span className="flex items-center gap-1 text-emerald-600"><Phone className="w-3.5 h-3.5" /> {client.phone}</span>}
                            </p>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Stats & Profile Summary */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm text-center">
                            <div className="w-20 h-20 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4 font-black text-3xl uppercase">
                                {client.full_name.charAt(0)}
                            </div>
                            <h3 className="font-black text-slate-900 text-lg mb-1 uppercase">{client.full_name}</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-6">Asegurado Premium</p>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center">Total/Mes</p>
                                    <p className="text-xl font-black text-slate-900">${Math.round(totalMonthly).toLocaleString("es-AR")}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center">Pólizas</p>
                                    <p className="text-xl font-black text-slate-900">{activePolicies.length}</p>
                                </div>
                            </div>
                        </div>

                        {/* Recent Payments Summary */}
                        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                            <h4 className="text-sm font-black text-slate-900 mb-6 flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-primary" />
                                Historial de Pagos
                            </h4>
                            <div className="space-y-4">
                                {(client.payments || []).slice(0, 5).sort((a: any, b: any) => b.month - a.month).map((p: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-[10px]",
                                                p.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600')}>
                                                <Calendar className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-slate-700 uppercase">Mes {p.month} - {p.year}</p>
                                                <p className="text-[10px] font-bold text-slate-400">{p.status === 'paid' ? 'COBRADO' : 'PENDIENTE'}</p>
                                            </div>
                                        </div>
                                        <p className="text-sm font-black text-slate-900">${Math.round(p.amount)}</p>
                                    </div>
                                ))}
                                {(!client.payments || client.payments.length === 0) && (
                                    <p className="text-xs text-slate-400 italic text-center py-4">No hay pagos registrados.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Policies & Detailed Grid */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Policies Section */}
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                                <Shield className="w-6 h-6 text-primary" />
                                Pólizas Activas
                            </h3>
                            <Link href="/dashboard/asegurar" className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2 hover:underline">
                                <Plus className="w-4 h-4" /> Nueva Póliza
                            </Link>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {client.policies?.length > 0 ? client.policies.map((p: any) => {
                                const typeConf = TYPE_CONFIG[p.type] || TYPE_CONFIG.otro;
                                const Icon = typeConf.icon;
                                return (
                                    <div key={p.id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all group">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className={cn("p-3 rounded-2xl", typeConf.bg, typeConf.color)}>
                                                <Icon className="w-6 h-6" />
                                            </div>
                                            <span className={cn(
                                                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                                p.status === 'vigente' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                    p.status === 'vencida' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                                        'bg-amber-50 text-amber-600 border border-amber-100'
                                            )}>
                                                {p.status}
                                            </span>
                                        </div>
                                        <h4 className="text-lg font-black text-slate-900 mb-1">N° {p.policy_number}</h4>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                                            {typeConf.label} {p.dominio && `•🚗 ${p.dominio}`}
                                        </p>

                                        <div className="space-y-3 pt-4 border-t border-slate-50">
                                            <div className="flex justify-between text-[11px] font-bold">
                                                <span className="text-slate-400">VENCE</span>
                                                <span className="text-slate-900">{formatDate(p.end_date)}</span>
                                            </div>
                                            <div className="flex justify-between text-[11px] font-bold">
                                                <span className="text-slate-400">IMPORTE MENSUAL</span>
                                                <span className="text-primary">${parseFloat(p.monthly_amount).toLocaleString("es-AR")}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="col-span-2 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center text-slate-400">
                                    <Shield className="w-12 h-12 opacity-10 mx-auto mb-4" />
                                    <p className="font-bold">No hay pólizas registradas para este cliente.</p>
                                </div>
                            )}
                        </div>

                        {/* Recent Documentation (Placeholder - Based on previous conversation) */}
                        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                            <h4 className="text-sm font-black text-slate-900 mb-6 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-primary" />
                                Documentación Escaneada
                            </h4>
                            <div className="flex items-center justify-center py-10 border-2 border-dashed border-slate-100 rounded-2xl text-slate-300 italic text-xs">
                                <p>No hay documentos adjuntos. Función por implementar.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
