"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/dashboard/sidebar";
import {
    History,
    Search,
    RefreshCw,
    Loader2,
    ArrowRight,
    Table,
    User,
    Calendar,
    Clock,
    Database,
    Tag,
    ChevronDown,
    ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

export default function AuditoriaPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            // Intentamos traer los logs y los perfiles por separado para máxima compatibilidad
            // ya que si la relación FK no está definida en Supabase, el join falla.
            const [logsRes, profilesRes] = await Promise.all([
                supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100),
                supabase.from("profiles").select("id, full_name, role")
            ]);

            if (logsRes.error) throw logsRes.error;

            const profilesMap = (profilesRes.data || []).reduce((acc: any, p) => {
                acc[p.id] = p;
                return acc;
            }, {});

            const mergedLogs = (logsRes.data || []).map(log => ({
                ...log,
                profiles: log.user_id ? profilesMap[log.user_id] : null
            }));

            setLogs(mergedLogs);
        } catch (error: any) {
            console.error("Error fetching logs:", error);
            // toast.error("Error al cargar auditoría: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchLogs(); }, []);

    const filtered = logs.filter(log => {
        const term = searchTerm.toLowerCase();
        return (
            log.action.toLowerCase().includes(term) ||
            log.table_name.toLowerCase().includes(term) ||
            (log.profiles?.full_name || "").toLowerCase().includes(term) ||
            log.record_id.toLowerCase().includes(term)
        );
    });

    const getActionColor = (action: string) => {
        switch (action) {
            case "INSERT": return "text-emerald-600 bg-emerald-50 border-emerald-100";
            case "UPDATE": return "text-amber-600 bg-amber-50 border-amber-100";
            case "DELETE": return "text-rose-600 bg-rose-50 border-rose-100";
            default: return "text-slate-600 bg-slate-50 border-slate-100";
        }
    };

    const getTableLabel = (table: string) => {
        const labels: Record<string, string> = {
            "clients": "Clientes",
            "payments": "Cobranzas",
            "policies": "Pólizas",
            "profiles": "Usuarios/Personal",
            "policy_installments": "Cuotas"
        };
        return labels[table.toLowerCase()] || table;
    };

    const getActionLabel = (action: string) => {
        const labels: Record<string, string> = {
            "INSERT": "Creó",
            "UPDATE": "Modificó",
            "DELETE": "Eliminó"
        };
        return labels[action] || action;
    };

    const getFriendlyDescription = (log: any) => {
        const action = log.action;
        const table = log.table_name.toLowerCase();
        const data = log.new_data || log.old_data || {};

        if (table === "clients") {
            if (action === "INSERT") return `Registró al cliente "${data.full_name}" (DNI: ${data.dni})`;
            if (action === "UPDATE") return `Actualizó datos del cliente "${data.full_name}"`;
            if (action === "DELETE") return `Eliminó/Desactivó al cliente "${data.full_name}"`;
        }

        if (table === "policies") {
            if (action === "INSERT") return `Creó póliza #${data.policy_number} (${data.type}) para un cliente`;
            if (action === "UPDATE") return `Actualizó la póliza #${data.policy_number}`;
            if (action === "DELETE") return `Eliminó del sistema la póliza #${data.policy_number}`;
        }

        if (table === "payments") {
            const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
            const monthName = months[data.month - 1] || "Mes " + data.month;
            if (action === "INSERT" || action === "UPDATE") {
                if (data.status === "paid") return `Registró COBRO de $${data.amount} (${monthName} ${data.year})`;
                return `Marcó pago de ${monthName} como "${data.status}"`;
            }
        }

        if (table === "profiles") {
            return `Modificó al usuario/staff "${data.full_name || data.username}"`;
        }

        return `Realizó una operación en la tabla ${getTableLabel(table)}`;
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
    };

    return (
        <div className="flex min-h-screen bg-slate-50/50">
            <Sidebar />
            <main className="flex-1 p-8">
                <header className="mb-8 flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
                            <History className="w-8 h-8 text-primary" />
                            Log de Auditoría
                        </h2>
                        <p className="text-muted-foreground font-medium mt-1">Historial detallado de cambios y acciones en el sistema</p>
                    </div>
                    <button
                        onClick={fetchLogs}
                        className="p-3 border border-slate-200 rounded-2xl hover:bg-white text-slate-400 hover:text-primary transition-all"
                    >
                        <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
                    </button>
                </header>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b flex items-center justify-between bg-slate-50/30 gap-4">
                        <div className="relative max-w-sm w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar por acción, tabla, usuario..."
                                className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all text-sm font-medium"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-3 text-xs font-black text-slate-400 uppercase tracking-widest">
                            {filtered.length} eventos registrados
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
                            <p className="font-bold italic">Cargando registros de auditoría...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">
                                        <th className="px-8 py-5">Fecha/Hora</th>
                                        <th className="px-5 py-5">Usuario</th>
                                        <th className="px-5 py-5 text-center">Acción</th>
                                        <th className="px-5 py-5">Módulo</th>
                                        <th className="px-5 py-5">Descripción de la Actividad</th>
                                        <th className="px-8 py-5 text-right">Detalles</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {filtered.length > 0 ? filtered.map((log) => (
                                        <React.Fragment key={log.id}>
                                            <tr className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-8 py-5 font-bold text-slate-600">
                                                    <div className="flex flex-col">
                                                        <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3 text-slate-400" /> {formatDate(log.created_at)}</span>
                                                        <span className="flex items-center gap-1.5 text-[10px] text-slate-400"><Clock className="w-3 h-3" /> {formatTime(log.created_at)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-5">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-primary font-black uppercase text-xs">
                                                            {log.profiles?.full_name?.charAt(0) || <User className="w-3.5 h-3.5" />}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-black text-slate-900 text-[11px] truncate uppercase tracking-tight">
                                                                {log.profiles?.full_name || "Sistema"}
                                                            </span>
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                                {log.profiles?.role || "Automático"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-5 text-center">
                                                    <span className={cn(
                                                        "px-3 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest",
                                                        getActionColor(log.action)
                                                    )}>
                                                        {getActionLabel(log.action)}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-5">
                                                    <span className="flex items-center gap-1.5 font-black text-slate-500 text-[10px] uppercase tracking-widest">
                                                        <Database className="w-3.5 h-3.5 text-primary/40" />
                                                        {getTableLabel(log.table_name)}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-5">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="font-bold text-slate-700 text-xs">
                                                            {getFriendlyDescription(log)}
                                                        </span>
                                                        <span className="text-[9px] font-mono text-slate-300 uppercase tracking-tighter">
                                                            ID: {log.record_id.split("-")[0]}...
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <button
                                                        onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                                                        className="p-2 hover:bg-slate-100 rounded-xl text-slate-300 hover:text-primary transition-all"
                                                    >
                                                        {expandedId === log.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                                    </button>
                                                </td>
                                            </tr>
                                            {expandedId === log.id && (
                                                <tr>
                                                    <td colSpan={6} className="px-8 py-6 bg-slate-50/50 border-b border-slate-100 animate-in slide-in-from-top-2 duration-200">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                            {log.old_data && (
                                                                <div className="space-y-3">
                                                                    <h4 className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                                        <Tag className="w-3 h-3" /> Datos Anteriores
                                                                    </h4>
                                                                    <pre className="p-4 bg-white border border-slate-200 rounded-2xl text-[10px] font-mono text-slate-600 max-h-60 overflow-auto shadow-inner">
                                                                        {JSON.stringify(log.old_data, null, 2)}
                                                                    </pre>
                                                                </div>
                                                            )}
                                                            {log.new_data && (
                                                                <div className="space-y-3">
                                                                    <h4 className="flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                                                                        <Database className="w-3 h-3" /> Datos Nuevos
                                                                    </h4>
                                                                    <pre className="p-4 bg-white border border-emerald-100 rounded-2xl text-[10px] font-mono text-slate-600 max-h-60 overflow-auto shadow-inner">
                                                                        {JSON.stringify(log.new_data, null, 2)}
                                                                    </pre>
                                                                </div>
                                                            )}
                                                            {!log.old_data && !log.new_data && (
                                                                <p className="text-xs text-slate-400 italic">No hay detalles adicionales disponibles.</p>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    )) : (
                                        <tr>
                                            <td colSpan={6} className="px-8 py-20 text-center text-muted-foreground font-medium italic">
                                                No se encontraron registros de auditoría.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

import React from "react";
