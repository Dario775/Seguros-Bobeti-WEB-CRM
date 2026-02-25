"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Sidebar from "@/components/dashboard/sidebar";
import NewClientDialog from "@/components/dashboard/new-client-dialog";
import EditClientDialog from "@/components/dashboard/edit-client-dialog";
import {
    Users, UserPlus, Search, Phone, Loader2, RefreshCw, IdCard,
    Pencil, Trash2, MessageSquare, MoreVertical, AlertTriangle, CheckCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { deleteClientAction } from "@/app/actions/clients";
import { getSystemSettings } from "@/app/actions/settings";
import { toast } from "sonner";

export default function ClientesPage() {
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [createOpen, setCreateOpen] = useState(false);
    const [editClient, setEditClient] = useState<any>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
    const [messageTemplate, setMessageTemplate] = useState('');
    const [userProfile, setUserProfile] = useState<any>(null);

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const fetchClients = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("clients")
                .select("*, payments(*)")
                .eq("is_active", true)
                .order("full_name", { ascending: true });

            if (error) {
                console.error("Fetch clients error:", error);
                // Fallback: try without payments join
                const { data: fallback } = await supabase
                    .from("clients")
                    .select("*")
                    .eq("is_active", true)
                    .order("full_name", { ascending: true });
                setClients((fallback || []).map((c: any) => ({ ...c, payments: [], policies: [] })));
            } else {
                // Fetch policies with their installments to find the next due date
                const { data: policies } = await supabase
                    .from("policies")
                    .select("*, policy_installments(*)")
                    .in("status", ["vigente", "por_vencer"]);

                const clientsWithData = data.map(c => ({
                    ...c,
                    policies: policies?.filter(p => p.client_id === c.id) || []
                }));
                setClients(clientsWithData);
            }
        } catch (err) {
            console.error("Fetch error:", err);
        }
        setLoading(false);
    };

    useEffect(() => {
        const fetchUserProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", user.id)
                    .single();
                setUserProfile(profile || { role: 'viewer', permissions: {} });
            }
        };
        fetchUserProfile();
        fetchSettings();
    }, []);

    useEffect(() => { fetchClients(); }, []);


    const filtered = clients.filter(c =>
        c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.dni || "").includes(searchTerm) ||
        (c.phone || "").includes(searchTerm)
    );

    const getPaymentSummary = (client: any) => {
        const payments = (client.payments || []).filter((p: any) => p.year === currentYear);
        const paid = payments.filter((p: any) => p.status === "paid").length;
        const overdue = payments.filter((p: any) => p.status === "overdue").length;
        const recordedMonths = new Set(payments.map((p: any) => p.month));
        let virtualOverdue = 0;
        for (let m = 1; m < currentMonth; m++) {
            if (!recordedMonths.has(m)) virtualOverdue++;
        }
        return { paid, overdue: overdue + virtualOverdue, total: 12 };
    };

    const fetchSettings = async () => {
        const res = await getSystemSettings();
        if (res.success) {
            setMessageTemplate(res.data.payment_message_template || '');
        }
    };

    const handleWhatsApp = (client: any) => {
        let message = messageTemplate || `Hola {nombre}! Te recordamos que el pago de tu cuota de {monto} vence el día {fecha}. Agencia La Segunda.`;

        // Buscar la PRÓXIMA cuota pendiente
        const allInstallments = client.policies?.flatMap((p: any) => p.policy_installments || []) || [];

        // Ordenar por fecha y filtrar las que no están pagadas
        const sortedPending = allInstallments
            .filter((i: any) => i.status !== "pagada")
            .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

        const nextInstallment = sortedPending[0];

        let dateStr = "próximo vencimiento";

        if (nextInstallment) {
            const dateObj = new Date(nextInstallment.due_date + "T00:00:00");
            const day = dateObj.getDate();
            const month = dateObj.toLocaleDateString("es-AR", { month: "long" }).toUpperCase();
            const year = dateObj.getFullYear();
            dateStr = `${day} de ${month} ${year}`;
        } else if (client.policies?.[0]) {
            // Fallback si no hay cuotas pero hay póliza
            const p = client.policies[0];
            const day = new Date(p.start_date + "T00:00:00").getDate();
            const monthName = new Date().toLocaleDateString("es-AR", { month: "long" }).toUpperCase();
            dateStr = `${day} de ${monthName} ${currentYear}`;
        }

        message = message
            .replace(/{ ?nombre ?}|\[ ?nombre ?\]/gi, client.full_name)
            .replace(/{ ?monto ?}|\[ ?monto ?\]/gi, "")
            .replace(/{ ?fecha ?}|\[ ?fecha ?\]/gi, dateStr)
            .replace(/ de vence /gi, " vence ");

        const phone = (client.phone || "").replace(/[+\s]/g, "").replace(/\D/g, "");
        if (!phone) { toast.error("Este cliente no tiene teléfono registrado"); return; }
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
    };

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        const result = await deleteClientAction(deleteConfirm.id);
        if (result.success) {
            toast.success(`${deleteConfirm.full_name} eliminado`);
            setDeleteConfirm(null);
            fetchClients();
        } else {
            toast.error(result.error || "Error al eliminar");
        }
    };

    return (
        <div className="flex flex-col lg:flex-row min-h-screen bg-background text-slate-900">
            <Sidebar />
            <main className="flex-1 p-4 md:p-8 pb-24 lg:pb-8">
                <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3">
                            <Users className="w-6 h-6 md:w-8 md:h-8 text-primary" />
                            Gestión de Asegurados
                        </h2>
                        <p className="text-muted-foreground font-medium mt-1 text-sm md:text-base">Base de datos centralizada de clientes - Agencia Digital</p>
                    </div>
                    {(userProfile?.role === "super_admin" || userProfile?.permissions?.clientes_crear) && (
                        <button
                            onClick={() => setCreateOpen(true)}
                            className="flex items-center justify-center gap-2 px-6 py-3 md:py-3.5 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all w-full md:w-auto"
                        >
                            <UserPlus className="w-4 h-4" />
                            Nuevo Asegurado
                        </button>
                    )}
                </header>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-4 md:p-6 border-b flex flex-col md:flex-row md:items-center justify-between bg-slate-50/30 gap-4">
                        <div className="relative w-full md:max-w-sm">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar por nombre, DNI o teléfono..."
                                className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all text-sm font-medium bg-white"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center justify-between md:justify-end gap-3">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {filtered.length} registro{filtered.length !== 1 ? "s" : ""}
                            </span>
                            <button onClick={fetchClients} className="p-2.5 border border-slate-200 rounded-xl hover:bg-white text-slate-400 hover:text-primary transition-all bg-white">
                                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary" />
                            <p className="font-bold italic text-sm">Cargando asegurados...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">
                                        <th className="px-8 py-5">Asegurado</th>
                                        <th className="px-5 py-5">DNI</th>
                                        <th className="px-5 py-5">Contacto</th>
                                        <th className="px-5 py-5">Cobranza {currentYear}</th>
                                        <th className="px-8 py-5 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {filtered.length > 0 ? filtered.map((client) => {
                                        const summary = getPaymentSummary(client);
                                        const paidPct = Math.round((summary.paid / summary.total) * 100);
                                        return (
                                            <tr key={client.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-8 py-5 font-black text-slate-900 uppercase">
                                                    <Link href={`/dashboard/clientes/${client.id}`} className="hover:text-primary transition-colors">
                                                        {client.full_name}
                                                    </Link>
                                                </td>
                                                <td className="px-5 py-5">
                                                    <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-500">
                                                        <IdCard className="w-3.5 h-3.5 text-primary" />
                                                        {client.dni}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-5">
                                                    <div className="flex items-center gap-2 font-bold text-slate-600 text-xs">
                                                        <Phone className="w-3.5 h-3.5 text-emerald-500" />
                                                        {client.phone || <span className="text-slate-300 italic">Sin tel.</span>}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-24 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                                            <div
                                                                className={cn(
                                                                    "h-full rounded-full transition-all",
                                                                    paidPct >= 80 ? "bg-emerald-500" : paidPct >= 50 ? "bg-amber-400" : "bg-rose-400"
                                                                )}
                                                                style={{ width: `${paidPct}%` }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-[10px] font-black">
                                                            <CheckCircle className="w-3 h-3 text-emerald-500" />
                                                            <span className="text-slate-600">{summary.paid}/{summary.total}</span>
                                                            {summary.overdue > 0 && (
                                                                <span className="flex items-center gap-0.5 text-rose-500 ml-1">
                                                                    <AlertTriangle className="w-3 h-3" /> {summary.overdue}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {(userProfile?.role === "super_admin" || userProfile?.permissions?.clientes_editar) && (
                                                            <button
                                                                onClick={() => setEditClient(client)}
                                                                className="p-2.5 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition-all"
                                                                title="Editar"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleWhatsApp(client)}
                                                            className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all"
                                                            title="WhatsApp"
                                                        >
                                                            <MessageSquare className="w-4 h-4" />
                                                        </button>
                                                        {(userProfile?.role === "super_admin" || userProfile?.permissions?.clientes_eliminar) && (
                                                            <button
                                                                onClick={() => setDeleteConfirm(client)}
                                                                className="p-2.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-all"
                                                                title="Eliminar"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan={5} className="px-8 py-20 text-center text-muted-foreground font-medium italic">
                                                {searchTerm ? "No se encontraron resultados" : "No hay asegurados registrados aún."}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>

            <NewClientDialog isOpen={createOpen} onClose={() => { setCreateOpen(false); fetchClients(); }} />

            {editClient && (
                <EditClientDialog isOpen={!!editClient} onClose={() => { setEditClient(null); fetchClients(); }} client={editClient} />
            )}

            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8 text-center animate-in zoom-in-95 duration-200">
                        <div className="bg-rose-50 p-4 rounded-2xl inline-flex mb-5">
                            <Trash2 className="w-8 h-8 text-rose-500" />
                        </div>
                        <h3 className="text-lg font-black text-slate-900 mb-2">¿Eliminar Asegurado?</h3>
                        <p className="text-sm text-slate-500 mb-8">
                            <span className="font-black text-slate-700">{deleteConfirm.full_name}</span> (DNI {deleteConfirm.dni}) será marcado como inactivo.
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
