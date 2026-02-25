"use client";

import { useState, useEffect, useMemo } from "react";
import {
    MessageSquare,
    CheckCircle,
    Clock,
    AlertTriangle,
    Search,
    Download,
    Filter,
    Loader2,
    RefreshCw,
    Printer
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { getSystemSettings } from "@/app/actions/settings";
import PaymentDialog from "./payment-dialog";

const months = [
    "ENE", "FEB", "MAR", "ABR", "MAY", "JUN",
    "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"
];

export default function CollectionGrid() {
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [clients, setClients] = useState<any[]>([]);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [policiesMap, setPoliciesMap] = useState<Record<string, { amount: number, activeMonths: number[], domains: string[], dueDay: number }>>({});
    const [messageTemplate, setMessageTemplate] = useState('');
    const [paymentAlertDays, setPaymentAlertDays] = useState(5);
    const [alertDaysInput, setAlertDaysInput] = useState("5");
    const [filterStatus, setFilterStatus] = useState<"all" | "overdue" | "paid" | "expiring">("all");
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // 1-12

    // Payment dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedCell, setSelectedCell] = useState<{
        clientId: string;
        clientName: string;
        month: number;
        payment: any;
        policyAmount: number;
    } | null>(null);

    const fetchData = async () => {
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
            setUserProfile(profile || { role: 'viewer', permissions: {} });
        }

        // Fetch clients with payments
        const { data: clientsData, error } = await supabase
            .from("clients")
            .select(`*, payments (*)`)
            .eq("is_active", true)
            .order("full_name", { ascending: true });

        if (error) {
            console.error("Error fetching data:", error);
            // Fallback without payments
            const { data: fallback } = await supabase
                .from("clients")
                .select("*")
                .eq("is_active", true)
                .order("full_name", { ascending: true });
            setClients((fallback || []).map((c: any) => ({ ...c, payments: [] })));
        } else {
            setClients(clientsData || []);
        }

        // Fetch policies to get monthly_amount and coverage periods per client
        const { data: policiesData } = await supabase
            .from("policies")
            .select("client_id, monthly_amount, status, start_date, end_date")
            .in("status", ["vigente", "por_vencer"]);

        const pMap: Record<string, { amount: number, activeMonths: number[], dueDay: number, domains: string[] }> = {};

        (policiesData || []).forEach((p: any) => {
            if (!pMap[p.client_id]) pMap[p.client_id] = { amount: 0, activeMonths: [], dueDay: 10, domains: [] };
            pMap[p.client_id].amount += parseFloat(p.monthly_amount);
            if (p.dominio) pMap[p.client_id].domains.push(p.dominio.toLowerCase());

            // Extraer el día de la póliza como día de vencimiento mensual
            try {
                const startDay = new Date(p.start_date + "T00:00:00").getDate();
                pMap[p.client_id].dueDay = startDay;
            } catch (e) { }

            // Determinar qué meses del currentYear cubre esta póliza
            const start = new Date(p.start_date);
            const end = new Date(p.end_date);

            for (let m = 1; m <= 12; m++) {
                const checkDate = new Date(currentYear, m - 1, 1);
                if (checkDate >= new Date(start.getFullYear(), start.getMonth(), 1) &&
                    checkDate <= new Date(end.getFullYear(), end.getMonth(), 1)) {
                    if (!pMap[p.client_id].activeMonths.includes(m)) {
                        pMap[p.client_id].activeMonths.push(m);
                    }
                }
            }
        });
        setPoliciesMap(pMap as any);
        setLoading(false);
    };

    useEffect(() => {
        const fetchSettings = async () => {
            const { data: settings } = await getSystemSettings();
            if (settings) {
                setMessageTemplate(settings.payment_message_template || '');
                const days = settings.payment_alert_days || 5;
                setPaymentAlertDays(days);
                setAlertDaysInput(String(days));
            }
        };
        fetchSettings();
    }, []);

    useEffect(() => { fetchData(); }, []);

    const getPaymentStatus = (client: any, monthIndex: number) => {
        const month = monthIndex + 1;
        const payment = client.payments?.find((p: any) => p.month === month && p.year === currentYear);
        if (payment) return payment;

        // Solo marcar como "vencido" o "por vencer" si hay una póliza activa en ese mes
        const policyInfo = policiesMap[client.id];
        const isCovered = policyInfo?.activeMonths.includes(month);

        if (isCovered) {
            const today = new Date();
            const todayTime = today.getTime();
            const dueDay = policyInfo?.dueDay || 10;
            const dueDate = new Date(currentYear, monthIndex, dueDay);
            const diffTime = dueDate.getTime() - todayTime;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (month < currentMonth || (month === currentMonth && diffDays < 0)) {
                return { status: "overdue", amount: 0, virtual: true };
            }

            if (diffDays <= paymentAlertDays && diffDays >= 0) {
                return { status: "expiring", amount: 0, virtual: true };
            }
        }
        return null;
    };

    const getStatusColor = (status: string | undefined) => {
        switch (status) {
            case "paid": return "bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200";
            case "pending": return "bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200";
            case "overdue": return "bg-rose-100 text-rose-700 border-rose-300 hover:bg-rose-200";
            case "expiring": return "bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200"; // Agregado color por vencer
            case "not_applicable": return "bg-slate-100 text-slate-400 border-slate-200";
            default: return "bg-slate-50 text-slate-300 border-slate-100 hover:bg-slate-100 hover:border-slate-200";
        }
    };

    const getStatusIcon = (status: string | undefined) => {
        switch (status) {
            case "paid": return <CheckCircle className="w-3 h-3" />;
            case "pending": return <Clock className="w-3 h-3" />;
            case "overdue": return <AlertTriangle className="w-3 h-3" />;
            case "expiring": return <Clock className="w-3 h-3 text-orange-600" />;
            default: return null;
        }
    };

    const handleCellClick = (client: any, monthIndex: number) => {
        const isAdmin = userProfile?.role === "super_admin" || userProfile?.role === "admin";
        const canEdit = isAdmin || userProfile?.permissions?.pagos_editar;
        if (!canEdit) return;

        const payment = getPaymentStatus(client, monthIndex);
        const isExisting = payment && !payment.virtual;

        // Restricción: Cobrador/Permiso simple solo puede REGISTRAR, no EDITAR lo ya cobrado
        if (!isAdmin && userProfile?.permissions?.pagos_editar && isExisting) {
            return;
        }

        const policyAmount = policiesMap[client.id]?.amount || 0;
        setSelectedCell({
            clientId: client.id,
            clientName: client.full_name,
            month: monthIndex + 1,
            payment: payment?.virtual ? null : payment,
            policyAmount,
        });
        setDialogOpen(true);
    };

    const handleWhatsApp = (client: any, monthIndex: number) => {
        const month = months[monthIndex];
        const amount = policiesMap[client.id]?.amount || 0;
        const amountFormatted = Math.round(amount).toLocaleString("es-AR");
        const dueDay = (policiesMap[client.id] as any)?.dueDay || 10;
        const date = `${dueDay} de ${month} ${currentYear}`;

        let message = messageTemplate || `Hola {nombre}! Te recordamos que el pago de tu cuota vence el día {fecha}. Agencia La Segunda.`;

        message = message
            .replace(/{ ?nombre ?}|\[ ?nombre ?\]/gi, client.full_name)
            .replace(/{ ?fecha ?}|\[ ?fecha ?\]/gi, date);

        const url = `https://wa.me/${(client.phone || "").replace("+", "").replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
        window.open(url, "_blank");
    };

    const handleExport = () => {
        // Metadatos para el encabezado de la plantilla
        const headerLines = [
            ["AGENCIA LA SEGUNDA SEGUROS - GESTIÓN PRO"],
            [`REPORTE DE COBRANZAS - MATRIZ ANUAL ${currentYear}`],
            [`EMITIDO EL: ${new Date().toLocaleDateString("es-AR")} ${new Date().toLocaleTimeString("es-AR")}`],
            [""],
            ["DNI", "Asegurado", ...months]
        ];

        const rows = filteredClients.map(client => {
            const monthData = months.map((_, i) => {
                const p = getPaymentStatus(client, i);
                if (p?.status === "paid") {
                    return "PAGADO";
                }
                if (p?.status === "overdue") return "VENCIDO";
                if (p?.status === "pending") return "PENDIENTE";
                return "-";
            });

            return [
                client.dni,
                client.full_name.toUpperCase(),
                ...monthData
            ];
        });

        const footerLines = [
            [""]
        ];

        const csvContent = [
            ...headerLines.map(r => r.join(";")),
            ...rows.map(r => r.join(";")),
            ...footerLines.map(r => r.join(";"))
        ].join("\n");

        const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `Reporte_Cobranzas_${currentYear}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredClients = useMemo(() => {
        return clients.filter(c => {
            const clientDomains = policiesMap[c.id]?.domains || [];
            const matchesSearch = c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (c.dni || "").includes(searchTerm) ||
                clientDomains.some(d => d.includes(searchTerm.toLowerCase()));

            const hasActivePolicy = !!policiesMap[c.id];
            const hasPayments = c.payments && c.payments.length > 0;

            if (!matchesSearch || (!hasActivePolicy && !hasPayments)) return false;

            if (filterStatus === "all") return true;

            // Lógica de filtros de estado
            let hasOverdue = false;
            let hasPaidCurrent = false;
            let hasExpiring = false;

            const today = new Date();
            const todayTime = today.getTime();

            for (let i = 0; i < 12; i++) {
                const p = getPaymentStatus(c, i);
                if (p?.status === "overdue") hasOverdue = true;
                if (i + 1 === currentMonth && p?.status === "paid") hasPaidCurrent = true;
                if (p?.status === "expiring") hasExpiring = true;
            }

            if (filterStatus === "overdue") return hasOverdue;
            if (filterStatus === "paid") return hasPaidCurrent;
            if (filterStatus === "expiring") return hasExpiring;

            return true;
        });
    }, [clients, searchTerm, policiesMap, filterStatus, currentMonth, paymentAlertDays, currentYear]);

    // Count stats memoized (Evita O(N*12) en cada render)
    const totalOverdue = useMemo(() => {
        return clients.reduce((acc, client) => {
            let overdueInMonth = 0;
            for (let i = 0; i < 12; i++) {
                const p = getPaymentStatus(client, i);
                if (p?.status === "overdue") overdueInMonth++;
            }
            return acc + overdueInMonth;
        }, 0);
    }, [clients, policiesMap]);

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-100 p-20 text-slate-400">
                <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
                <p className="font-bold italic">Cargando base de datos de cobranzas...</p>
            </div>
        );
    }

    return (
        <>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full">
                {/* Header */}
                <div className="p-4 border-b bg-slate-50/50 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    <div className="flex flex-col lg:flex-row items-center gap-4 flex-1">
                        <div className="relative w-full lg:max-w-xs xl:max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar por nombre, DNI o Patente..."
                                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="flex bg-white border rounded-xl p-1 shadow-sm w-full lg:w-auto overflow-x-auto no-scrollbar">
                            <button
                                onClick={() => setFilterStatus("all")}
                                className={cn(
                                    "flex-1 lg:flex-initial px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                    filterStatus === "all" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"
                                )}
                            >
                                Todos
                            </button>
                            <button
                                onClick={() => setFilterStatus("overdue")}
                                className={cn(
                                    "flex-1 lg:flex-initial px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                    filterStatus === "overdue" ? "bg-rose-500 text-white shadow-lg shadow-rose-200" : "text-rose-600 hover:bg-rose-50"
                                )}
                            >
                                Con Deuda
                            </button>
                            <button
                                onClick={() => setFilterStatus("expiring")}
                                className={cn(
                                    "flex-1 lg:flex-initial flex items-center justify-center px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                                    filterStatus === "expiring" ? "bg-orange-500 text-white shadow-lg shadow-orange-200" : "text-orange-600 hover:bg-orange-50"
                                )}
                            >
                                Por Vencer
                                {filterStatus === "expiring" && (
                                    <span className="flex items-center ml-2 border-l border-orange-400 pl-2">
                                        a
                                        <input
                                            type="text"
                                            value={alertDaysInput}
                                            onChange={(e) => setAlertDaysInput(e.target.value.replace(/\D/g, ''))}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    const val = parseInt(alertDaysInput, 10);
                                                    if (!isNaN(val) && val >= 0) {
                                                        setPaymentAlertDays(val);
                                                    } else {
                                                        setAlertDaysInput(String(paymentAlertDays));
                                                    }
                                                }
                                            }}
                                            onBlur={() => {
                                                const val = parseInt(alertDaysInput, 10);
                                                if (!isNaN(val) && val >= 0) {
                                                    setPaymentAlertDays(val);
                                                } else {
                                                    setAlertDaysInput(String(paymentAlertDays));
                                                }
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-8 ml-1 bg-transparent border-b border-orange-300 text-center text-[10px] font-bold outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                        días
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setFilterStatus("paid")}
                                className={cn(
                                    "flex-1 lg:flex-initial px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                    filterStatus === "paid" ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200" : "text-emerald-600 hover:bg-emerald-50"
                                )}
                            >
                                Al Día
                            </button>
                        </div>

                        {totalOverdue > 0 && filterStatus !== "overdue" && (
                            <div className="flex items-center justify-center gap-2 bg-rose-50 text-rose-600 px-4 py-2 rounded-xl border border-rose-100 text-[10px] font-black uppercase tracking-widest w-full lg:w-auto animate-pulse">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                {totalOverdue} vencidos
                            </div>
                        )}
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-2">
                        <button
                            onClick={() => fetchData()}
                            className="p-2 border border-slate-200 rounded-xl hover:bg-white transition-colors text-slate-400 hover:text-primary bg-white"
                            title="Actualizar datos"
                        >
                            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                        </button>
                        <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                            <button
                                onClick={handleExport}
                                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold bg-primary text-white rounded-xl hover:opacity-90 transition-opacity shadow-sm"
                                title="Descargar Excel/CSV"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span className="sm:inline">Exportar</span>
                            </button>
                            <button
                                onClick={() => window.print()}
                                className="hidden sm:flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold bg-slate-800 text-white rounded-xl hover:opacity-90 transition-opacity shadow-sm"
                                title="Imprimir vista actual"
                            >
                                <Printer className="w-3.5 h-3.5" />
                                <span className="sm:inline">Imprimir</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table Grid */}
                <div className="overflow-auto flex-1">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-100/80 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest border-b">
                                <th className="px-3 py-4 text-left sticky left-0 z-30 bg-slate-100 border-r min-w-[70px]">DNI</th>
                                <th className="px-4 py-4 text-left sticky left-[70px] z-30 bg-slate-100 border-r min-w-[200px]">Asegurado</th>
                                {months.map((m, i) => (
                                    <th key={m} className={cn(
                                        "px-2 py-4 text-center border-r min-w-[85px]",
                                        i + 1 === currentMonth && "bg-primary/10 text-primary"
                                    )}>
                                        {m}
                                    </th>
                                ))}
                                <th className="px-4 py-4 text-center min-w-[60px]">Notif.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredClients.map((client) => (
                                <tr key={client.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-3 py-3 whitespace-nowrap sticky left-0 z-20 bg-white border-r font-mono text-[11px] text-slate-400 font-bold group-hover:bg-slate-50/50">
                                        {client.dni}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap sticky left-[70px] z-20 bg-white border-r font-bold text-slate-900 text-xs text-left group-hover:bg-slate-50/50 uppercase">
                                        {client.full_name}
                                    </td>
                                    {Array.from({ length: 12 }).map((_, i) => {
                                        const payment = getPaymentStatus(client, i);
                                        const isFuture = i + 1 > currentMonth;
                                        return (
                                            <td key={i} className={cn("p-1 border-r last:border-r-0", i + 1 === currentMonth && "bg-primary/5")}>
                                                <div
                                                    className={cn(
                                                        "h-10 rounded-lg border-2 flex flex-col items-center justify-center gap-0.5 transition-all text-[10px] font-black",
                                                        (userProfile?.role === "super_admin" || userProfile?.role === "admin" || userProfile?.permissions?.pagos_editar) ? "cursor-pointer hover:scale-95" : "cursor-not-allowed",
                                                        isFuture ? "opacity-40" : "",
                                                        getStatusColor(payment?.status)
                                                    )}
                                                    onClick={() => handleCellClick(client, i)}
                                                    title={(userProfile?.role === "super_admin" || userProfile?.role === "admin" || userProfile?.permissions?.pagos_editar) ? `Click para ${payment ? "editar" : "registrar"} pago` : ""}
                                                >
                                                    {payment ? (
                                                        <>
                                                            {getStatusIcon(payment.status)}
                                                            <span>
                                                                {payment.status === "paid" ? "OK" : payment.status === "overdue" ? "!" : "---"}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <span className="text-slate-200">+</span>
                                                    )}
                                                </div>
                                            </td>
                                        );
                                    })}
                                    <td className="px-4 py-3 whitespace-nowrap text-center">
                                        <button
                                            onClick={() => handleWhatsApp(client, currentMonth - 1)}
                                            className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-all inline-block active:scale-90"
                                            title="Enviar WhatsApp"
                                        >
                                            <MessageSquare className="w-5 h-5 fill-emerald-50" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Legend */}
                <div className="p-3 bg-slate-50/80 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] font-bold text-slate-500">
                    <div className="flex items-center gap-4 flex-wrap justify-center">
                        <span className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 rounded bg-emerald-100 border border-emerald-300" /> COBRADO</span>
                        <span className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 rounded bg-amber-100 border border-amber-300" /> PENDIENTE</span>
                        <span className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 rounded bg-orange-100 border border-orange-300" /> POR VENCER</span>
                        <span className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 rounded bg-rose-100 border border-rose-300" /> VENCIDO</span>
                        <span className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 rounded bg-slate-100 border border-slate-300" /> SIN REGISTRO</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="uppercase tracking-widest opacity-60">
                            {filteredClients.length} asegurados • Matriz {currentYear}
                        </span>
                    </div>
                </div>
            </div>

            {/* Payment Dialog */}
            {selectedCell && (
                <PaymentDialog
                    isOpen={dialogOpen}
                    onClose={() => { setDialogOpen(false); setSelectedCell(null); }}
                    onSuccess={fetchData}
                    clientName={selectedCell.clientName}
                    clientId={selectedCell.clientId}
                    month={selectedCell.month}
                    monthName={months[selectedCell.month - 1]}
                    year={currentYear}
                    currentPayment={selectedCell.payment}
                    policyAmount={selectedCell.policyAmount}
                />
            )}
            {/* Template de Impresión (Invisible en UI, solo visible en papel) */}
            <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-8 text-slate-900 overflow-visible h-auto">
                <div className="flex justify-between items-start mb-10 border-b-2 border-primary pb-6">
                    <div>
                        <h1 className="text-2xl font-black uppercase text-primary mb-1">La Segunda Seguros</h1>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Matriz de Cobranzas Anual — Gestión Pro</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black uppercase text-slate-400">Fecha de Emisión</p>
                        <p className="text-xs font-bold">{new Date().toLocaleDateString("es-AR")} — {new Date().toLocaleTimeString("es-AR")}</p>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-8 mb-10">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Año Fiscal</p>
                        <p className="text-xl font-black text-primary">{currentYear}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Total Asegurados</p>
                        <p className="text-xl font-black text-primary">{filteredClients.length}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Estado General</p>
                        <p className="text-lg font-black text-emerald-600">Sincronizado</p>
                    </div>
                </div>

                <table className="w-full text-[9px] border-collapse border border-slate-200">
                    <thead>
                        <tr className="bg-slate-100 uppercase font-black tracking-tighter">
                            <th className="border border-slate-200 p-2 text-left">DNI</th>
                            <th className="border border-slate-200 p-2 text-left">Asegurado</th>
                            <th className="border border-slate-200 p-2 text-center">Premio</th>
                            {months.map(m => (
                                <th key={m} className="border border-slate-200 p-1 text-center">{m}</th>
                            ))}
                            <th className="border border-slate-200 p-2 text-center bg-slate-200">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredClients.map(client => {
                            const policyAmount = policiesMap[client.id]?.amount || 0;
                            let clientTotal = 0;
                            return (
                                <tr key={client.id} className="border-b border-slate-100">
                                    <td className="border border-slate-200 p-2 font-mono text-slate-500">{client.dni}</td>
                                    <td className="border border-slate-200 p-2 font-bold uppercase">{client.full_name}</td>
                                    <td className="border border-slate-200 p-2 text-center">${Math.round(policyAmount)}</td>
                                    {months.map((_, i) => {
                                        const p = getPaymentStatus(client, i);
                                        if (p?.status === "paid") clientTotal += parseFloat(p.amount || policyAmount);
                                        return (
                                            <td key={i} className={cn(
                                                "border border-slate-200 p-1 text-center font-bold",
                                                p?.status === "paid" ? "text-emerald-700" : p?.status === "overdue" ? "text-rose-600 bg-rose-50" : "text-slate-300"
                                            )}>
                                                {p?.status === "paid" ? "✓" : p?.status === "overdue" ? "!" : "-"}
                                            </td>
                                        );
                                    })}
                                    <td className="border border-slate-200 p-2 text-center font-black bg-slate-50">${Math.round(clientTotal)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                <div className="mt-16 pt-8 border-t border-dotted border-slate-300 flex justify-between">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">
                        Documento generado digitalmente por La Segunda Seguros - Gestión Pro
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold">
                        Página 1 de 1
                    </div>
                </div>
            </div>
        </>
    );
}
