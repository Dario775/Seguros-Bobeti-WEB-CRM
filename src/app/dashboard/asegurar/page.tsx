"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/dashboard/sidebar";
import NewPolicyDialog from "@/components/dashboard/new-policy-dialog";
import {
    ShieldPlus, ShieldCheck, ShieldAlert, ShieldX, Plus, Loader2, RefreshCw,
    Search, ChevronDown, ChevronRight, Trash2, CheckCircle, Clock, AlertTriangle,
    Calendar, Car, Home, Heart, Store, HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getPoliciesAction, deletePolicyAction, payInstallmentAction, updatePolicyStatusesAction } from "@/app/actions/policies";
import { getSystemSettings } from "@/app/actions/settings";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
    auto: { label: "Automotor", icon: Car, color: "text-blue-600 bg-blue-50" },
    hogar: { label: "Hogar", icon: Home, color: "text-violet-600 bg-violet-50" },
    vida: { label: "Vida", icon: Heart, color: "text-rose-600 bg-rose-50" },
    comercio: { label: "Comercio", icon: Store, color: "text-amber-600 bg-amber-50" },
    otro: { label: "Otro", icon: HelpCircle, color: "text-slate-600 bg-slate-50" },
};

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
    vigente: { label: "Vigente", icon: ShieldCheck, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
    por_vencer: { label: "Por Vencer", icon: ShieldAlert, color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
    vencida: { label: "Vencida", icon: ShieldX, color: "text-rose-700", bg: "bg-rose-50 border-rose-200" },
    cancelada: { label: "Cancelada", icon: ShieldX, color: "text-slate-500", bg: "bg-slate-50 border-slate-200" },
};

export default function AsegurarPage() {
    const [policies, setPolicies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
    const [messageTemplate, setMessageTemplate] = useState('');
    const [userProfile, setUserProfile] = useState<any>(null);

    const fetchPolicies = async () => {
        setLoading(true);
        await updatePolicyStatusesAction();
        const result = await getPoliciesAction();
        if (result.success) setPolicies(result.data || []);
        else toast.error("Error al cargar pólizas");
        setLoading(false);
    };

    useEffect(() => {
        fetchPolicies();
        const fetchSettings = async () => {
            const { data } = await getSystemSettings();
            if (data) setMessageTemplate(data.payment_message_template || '');
        };
        const fetchUserProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
                setUserProfile(profile || { role: 'viewer', permissions: {} });
            }
        };
        fetchSettings();
        fetchUserProfile();
    }, []);

    const filtered = policies.filter((p) => {
        const term = searchTerm.toLowerCase();
        return (
            p.policy_number?.toLowerCase().includes(term) ||
            p.dominio?.toLowerCase().includes(term) ||
            p.client?.full_name?.toLowerCase().includes(term) ||
            p.client?.dni?.includes(term)
        );
    });

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        const result = await deletePolicyAction(deleteConfirm.id);
        if (result.success) { toast.success("Póliza eliminada"); setDeleteConfirm(null); fetchPolicies(); }
        else toast.error(result.error || "Error");
    };

    const handlePayInstallment = async (instId: string) => {
        const result = await payInstallmentAction(instId);
        if (result.success) { toast.success("Cuota marcada como pagada ✓"); fetchPolicies(); }
        else toast.error("Error al registrar pago");
    };

    const formatDate = (d: string) => {
        if (!d) return "—";
        return new Date(d + "T00:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });
    };

    const sendWhatsApp = (phone: string, clientName: string, amount: number, dueDate: string) => {
        const dateObj = new Date(dueDate + "T00:00:00");
        const day = dateObj.getDate();
        const month = dateObj.toLocaleDateString("es-AR", { month: "long" }).toUpperCase();
        const year = dateObj.getFullYear();
        const dateFormatted = `${day} de ${month} ${year}`;

        const amountFormatted = `$${Math.round(amount).toLocaleString("es-AR")}`;

        let message = messageTemplate || `Hola {nombre}! Te recordamos que el pago de tu cuota de {monto} vence el día {fecha}. Agencia La Segunda.`;

        message = message
            .replace(/{ ?nombre ?}|\[ ?nombre ?\]/gi, clientName)
            .replace(/{ ?monto ?}|\[ ?monto ?\]/gi, amountFormatted)
            .replace(/{ ?fecha ?}|\[ ?fecha ?\]/gi, dateFormatted);

        const phoneClean = (phone || "").replace(/[+\s]/g, "").replace(/\D/g, "");
        if (!phoneClean) { toast.error("Este cliente no tiene teléfono registrado"); return; }
        window.open(`https://wa.me/${phoneClean}?text=${encodeURIComponent(message)}`, "_blank");
    };

    // Stats
    const vigentes = policies.filter(p => p.status === "vigente").length;
    const porVencer = policies.filter(p => p.status === "por_vencer").length;
    const vencidas = policies.filter(p => p.status === "vencida").length;

    // Cuotas stats
    const allInstallments = policies.flatMap(p => p.policy_installments || []);
    const cuotasVencidas = allInstallments.filter((i: any) => i.status === "vencida").length;
    const cuotasPendientes = allInstallments.filter((i: any) => i.status === "pendiente").length;

    return (
        <div className="flex min-h-screen bg-background text-slate-900">
            <Sidebar />
            <main className="flex-1 p-8">
                <header className="mb-8 flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
                            <ShieldPlus className="w-8 h-8 text-primary" />
                            Asegurar
                        </h2>
                        <p className="text-muted-foreground font-medium mt-1">Gestión de pólizas, vencimientos y cuotas mensuales</p>
                    </div>
                    {(userProfile?.role === "super_admin" || userProfile?.permissions?.polizas_crear) && (
                        <button
                            onClick={() => setDialogOpen(true)}
                            className="flex items-center gap-2 px-6 py-3.5 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                        >
                            <Plus className="w-4 h-4" /> Nueva Póliza
                        </button>
                    )}
                </header>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4">
                        <div className="bg-emerald-50 p-3 rounded-xl"><ShieldCheck className="w-5 h-5 text-emerald-600" /></div>
                        <div>
                            <p className="text-2xl font-black text-slate-900">{vigentes}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vigentes</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4">
                        <div className="bg-amber-50 p-3 rounded-xl"><ShieldAlert className="w-5 h-5 text-amber-600" /></div>
                        <div>
                            <p className="text-2xl font-black text-slate-900">{porVencer}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Por Vencer</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4">
                        <div className="bg-rose-50 p-3 rounded-xl"><ShieldX className="w-5 h-5 text-rose-600" /></div>
                        <div>
                            <p className="text-2xl font-black text-slate-900">{vencidas}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vencidas</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4">
                        <div className="bg-orange-50 p-3 rounded-xl"><AlertTriangle className="w-5 h-5 text-orange-600" /></div>
                        <div>
                            <p className="text-2xl font-black text-slate-900">{cuotasVencidas}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cuotas Vencidas</p>
                        </div>
                    </div>
                </div>

                {/* Policies List */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b flex items-center justify-between bg-slate-50/30 gap-4">
                        <div className="relative max-w-sm w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar por póliza, dominio, cliente..."
                                className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all text-sm font-medium"
                                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                {filtered.length} póliza{filtered.length !== 1 ? "s" : ""}
                            </span>
                            <button onClick={fetchPolicies} className="p-2.5 border border-slate-200 rounded-xl hover:bg-white text-slate-400 hover:text-primary transition-all">
                                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary" />
                            <p className="font-bold italic text-sm">Cargando pólizas...</p>
                        </div>
                    ) : (
                        <div>
                            {filtered.length > 0 ? filtered.map((policy) => {
                                const typeConf = TYPE_CONFIG[policy.type] || TYPE_CONFIG.otro;
                                const statusConf = STATUS_CONFIG[policy.status] || STATUS_CONFIG.vigente;
                                const TypeIcon = typeConf.icon;
                                const StatusIcon = statusConf.icon;
                                const installments = (policy.policy_installments || []).sort((a: any, b: any) => a.number - b.number);
                                const paidCount = installments.filter((i: any) => i.status === "pagada").length;
                                const overdueCount = installments.filter((i: any) => i.status === "vencida").length;
                                const paidPercent = installments.length ? Math.round((paidCount / installments.length) * 100) : 0;
                                const isExpanded = expandedId === policy.id;

                                return (
                                    <div key={policy.id} className="border-b border-slate-100 last:border-0">
                                        {/* Main Row */}
                                        <div
                                            className="flex items-center px-6 py-5 hover:bg-slate-50/50 transition-colors cursor-pointer gap-3"
                                            onClick={() => setExpandedId(isExpanded ? null : policy.id)}
                                        >
                                            <button className="text-slate-300 shrink-0">
                                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                            </button>

                                            <div className={cn("p-2 rounded-xl shrink-0", typeConf.color)}>
                                                <TypeIcon className="w-4 h-4" />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <p className="font-black text-slate-900 text-sm truncate">{policy.client?.full_name || "Sin cliente"}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                    {typeConf.label} • N° {policy.policy_number}
                                                    {policy.dominio && <span className="ml-2 text-primary">🚗 {policy.dominio}</span>}
                                                </p>
                                            </div>

                                            {/* Vigencia */}
                                            <div className="text-right mr-2 hidden lg:block shrink-0">
                                                <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                                                    <Calendar className="w-3 h-3" />
                                                    {formatDate(policy.start_date)} → {formatDate(policy.end_date)}
                                                </p>
                                            </div>

                                            {/* Cuotas progress */}
                                            <div className="shrink-0 w-32 hidden md:block">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                                                        <div
                                                            className={cn("h-full rounded-full transition-all", paidPercent === 100 ? "bg-emerald-500" : "bg-primary")}
                                                            style={{ width: `${paidPercent}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-500">{paidCount}/{installments.length}</span>
                                                </div>
                                                {overdueCount > 0 && (
                                                    <p className="text-[10px] font-black text-rose-500 flex items-center gap-1 mt-1">
                                                        <AlertTriangle className="w-3 h-3" /> {overdueCount} vencida{overdueCount > 1 ? "s" : ""}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Monthly amount */}
                                            <div className="text-right mr-2 shrink-0">
                                                <p className="text-sm font-black text-slate-900">${parseFloat(policy.monthly_amount).toLocaleString("es-AR")}</p>
                                                <p className="text-[10px] font-bold text-slate-400">/mes</p>
                                            </div>

                                            {/* Status badge */}
                                            <div className={cn("px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0", statusConf.bg, statusConf.color)}>
                                                <StatusIcon className="w-3 h-3" />
                                                {statusConf.label}
                                            </div>

                                            {(userProfile?.role === "super_admin" || userProfile?.permissions?.polizas_eliminar) && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm(policy); }}
                                                    className="p-2 hover:bg-rose-50 rounded-xl text-slate-300 hover:text-rose-500 transition-all ml-1 shrink-0"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>

                                        {/* Expanded: Installments grid */}
                                        {isExpanded && (
                                            <div className="px-8 pb-6 pl-14 animate-in slide-in-from-top-2 duration-200">
                                                {policy.notes && (
                                                    <p className="text-xs text-slate-500 italic mb-4 bg-slate-50 rounded-xl p-3 border border-slate-100">📝 {policy.notes}</p>
                                                )}
                                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                                    {installments.map((inst: any) => {
                                                        const isPaid = inst.status === "pagada";
                                                        const isOverdue = inst.status === "vencida";
                                                        return (
                                                            <div key={inst.id}
                                                                className={cn(
                                                                    "flex items-center justify-between px-4 py-3 rounded-2xl border transition-all",
                                                                    isPaid && "bg-emerald-50/50 border-emerald-200",
                                                                    isOverdue && "bg-rose-50/50 border-rose-200 shadow-sm shadow-rose-100",
                                                                    !isPaid && !isOverdue && "bg-white border-slate-200"
                                                                )}>
                                                                <div className="flex items-center gap-2.5">
                                                                    {isPaid ? <CheckCircle className="w-4 h-4 text-emerald-500" /> :
                                                                        isOverdue ? <AlertTriangle className="w-4 h-4 text-rose-500" /> :
                                                                            <Clock className="w-4 h-4 text-slate-300" />}
                                                                    <div>
                                                                        <p className="text-xs font-black text-slate-700">Cuota {inst.number}</p>
                                                                        <p className="text-[10px] font-bold text-slate-400">{formatDate(inst.due_date)}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    {!isPaid && policy.client?.phone && (
                                                                        <button
                                                                            onClick={() => sendWhatsApp(policy.client.phone, policy.client.full_name, inst.amount, inst.due_date)}
                                                                            className="p-1 px-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all border border-transparent hover:border-emerald-200"
                                                                            title="Avisar por WhatsApp"
                                                                        >
                                                                            <Calendar className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    )}
                                                                    {!isPaid ? (
                                                                        (userProfile?.role === "super_admin" || userProfile?.role === "admin" || userProfile?.permissions?.pagos_editar) ? (
                                                                            <button
                                                                                onClick={() => handlePayInstallment(inst.id)}
                                                                                className={cn(
                                                                                    "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm",
                                                                                    isOverdue
                                                                                        ? "bg-rose-500 text-white hover:bg-rose-600"
                                                                                        : "bg-primary text-white hover:scale-105 active:scale-95"
                                                                                )}
                                                                            >
                                                                                Pagar
                                                                            </button>
                                                                        ) : (
                                                                            <span className="text-[10px] font-black text-slate-300 uppercase">Pendiente</span>
                                                                        )
                                                                    ) : (
                                                                        <span className="text-[10px] font-black text-emerald-600 uppercase">✓ Pagada</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            }) : (
                                <div className="px-8 py-20 text-center text-muted-foreground font-medium italic">
                                    {searchTerm ? "No se encontraron resultados" : "No hay pólizas registradas aún."}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            <NewPolicyDialog isOpen={dialogOpen} onClose={() => { setDialogOpen(false); fetchPolicies(); }} />

            {/* Delete Confirmation */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8 text-center animate-in zoom-in-95 duration-200">
                        <div className="bg-rose-50 p-4 rounded-2xl inline-flex mb-5">
                            <Trash2 className="w-8 h-8 text-rose-500" />
                        </div>
                        <h3 className="text-lg font-black text-slate-900 mb-2">¿Eliminar Póliza?</h3>
                        <p className="text-sm text-slate-500 mb-8">
                            Póliza <span className="font-black text-slate-700">{deleteConfirm.policy_number}</span> y todas sus cuotas serán eliminadas permanentemente.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-3.5 border border-slate-200 rounded-2xl font-black text-slate-500 text-xs uppercase tracking-widest hover:bg-slate-50">
                                Cancelar
                            </button>
                            <button onClick={handleDelete} className="flex-1 px-4 py-3.5 bg-rose-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-200 hover:bg-rose-600 transition-all">
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
