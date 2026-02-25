"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/dashboard/sidebar";
import {
    Users,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    Calendar,
    Loader2,
    RefreshCw,
    BarChart3,
    Shield,
    PieChart,
    Car,
    Home,
    Heart,
    Store,
    HelpCircle
} from "lucide-react";
import { cn, getMonthName } from "@/lib/utils";
import { getDashboardStats } from "@/app/actions/payments";
import { supabase } from "@/lib/supabase";
import ExpiringAlerts from "@/components/dashboard/expiring-alerts";
import UpcomingPaymentsAlerts from "@/components/dashboard/upcoming-payments-alerts";

export default function DashboardPage() {
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [currentMonthName, setCurrentMonthName] = useState("");

    const fetchStats = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
                if (profile && profile.role !== "super_admin" && profile.permissions && profile.permissions.dashboard === false) {
                    setLoading(false);
                    setError("ACCESS_DENIED");
                    return;
                }
            }

            const result = await getDashboardStats(selectedMonth, selectedYear);
            if (result.success) {
                setStats(result.data);
                setCurrentMonthName(getMonthName(selectedMonth - 1));
            } else {
                setError(result.error || "Ocurrió un error al cargar las estadísticas.");
            }
        } catch (err: any) {
            setError(err.message || "Error de conexión.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [selectedMonth, selectedYear]);

    const statCards = stats ? [
        {
            label: "Total Asegurados",
            value: stats.totalClients.toString(),
            icon: Users,
            color: "text-blue-600",
            bg: "bg-blue-50"
        },
        {
            label: `Cobrado ${currentMonthName}`,
            value: `${stats.collectionRate}%`,
            icon: TrendingUp,
            color: "text-emerald-600",
            bg: "bg-emerald-50"
        },
        {
            label: "Pagos Vencidos",
            value: stats.overdueCount.toString(),
            icon: AlertCircle,
            color: stats.overdueCount > 0 ? "text-rose-600" : "text-emerald-600",
            bg: stats.overdueCount > 0 ? "bg-rose-50" : "bg-emerald-50"
        },
        {
            label: `Pendientes ${currentMonthName}`,
            value: stats.pendingThisMonth.toString(),
            icon: Calendar,
            color: "text-amber-600",
            bg: "bg-amber-50"
        },
    ] : [];

    const getMovementStyle = (status: string) => {
        switch (status) {
            case "paid": return { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" };
            case "overdue": return { icon: AlertCircle, color: "text-rose-600", bg: "bg-rose-50" };
            case "pending": return { icon: Calendar, color: "text-amber-600", bg: "bg-amber-50" };
            default: return { icon: Calendar, color: "text-slate-400", bg: "bg-slate-50" };
        }
    };

    const formatTimeAgo = (dateStr: string) => {
        const diffMs = Date.now() - new Date(dateStr).getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return "Ahora";
        if (diffMins < 60) return `Hace ${diffMins}m`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `Hace ${diffHours}h`;
        const diffDays = Math.floor(diffHours / 24);
        return `Hace ${diffDays}d`;
    };

    return (
        <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50/50">
            <Sidebar />
            <main className="flex-1 p-4 md:p-8 pb-24 lg:pb-8">
                <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight text-center md:text-left">Resumen Administrativo</h2>
                        <p className="text-muted-foreground font-medium mt-1 text-sm md:text-base text-center md:text-left">Panel de control de la Agencia Digital - Gestión {selectedYear}</p>
                    </div>

                    <div className="flex items-center justify-center md:justify-end gap-3">
                        <div className="flex bg-white border border-slate-200 rounded-2xl p-1 shadow-sm">
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                className="bg-transparent px-2 md:px-3 py-1.5 text-[10px] md:text-xs font-black text-slate-700 outline-none border-r border-slate-100"
                            >
                                {Array.from({ length: 12 }).map((_, i) => (
                                    <option key={i + 1} value={i + 1}>{getMonthName(i)}</option>
                                ))}
                            </select>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                className="bg-transparent px-2 md:px-3 py-1.5 text-[10px] md:text-xs font-black text-slate-700 outline-none"
                            >
                                {[0, 1].map(offset => (
                                    <option key={offset} value={new Date().getFullYear() - offset}>
                                        {new Date().getFullYear() - offset}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={fetchStats}
                            className="p-3 border border-slate-200 rounded-2xl hover:bg-white text-slate-400 hover:text-primary transition-all shadow-sm bg-white"
                            title="Actualizar datos"
                        >
                            <RefreshCw className={cn("w-4 h-4 md:w-5 md:h-5", loading && "animate-spin")} />
                        </button>
                    </div>
                </header>

                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                        <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
                        <p className="font-bold italic">Cargando estadísticas...</p>
                    </div>
                ) : error === "ACCESS_DENIED" ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-3xl p-12 text-center max-w-2xl mx-auto flex flex-col items-center">
                        <div className="bg-slate-200 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Shield className="w-8 h-8 text-slate-500" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-2">Acceso Restringido</h3>
                        <p className="text-slate-500 font-medium">
                            Tu rol no tiene permisos para visualizar este panel. <br />
                            <span className="text-xs font-black uppercase tracking-widest mt-4 block text-slate-400">
                                Utiliza el menú lateral para navegar
                            </span>
                        </p>
                    </div>
                ) : error ? (
                    <div className="bg-rose-50 border border-rose-100 rounded-3xl p-12 text-center max-w-2xl mx-auto">
                        <div className="bg-rose-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <AlertCircle className="w-8 h-8 text-rose-600" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-2">Error al cargar datos</h3>
                        <p className="text-slate-600 mb-8 font-medium">
                            {error}. <br />
                            <span className="text-xs opacity-75 italic text-rose-500">
                                Tip: Asegúrate de haber ejecutado las últimas actualizaciones de `supabase.sql` en tu Editor SQL.
                            </span>
                        </p>
                        <button
                            onClick={fetchStats}
                            className="bg-white border border-slate-200 px-6 py-2.5 rounded-2xl font-black text-xs text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
                        >
                            Reintentar
                        </button>
                    </div>
                ) : stats && (
                    <>
                        {/* KPI Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-12">
                            {statCards.map((stat) => (
                                <div key={stat.label} className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col sm:flex-row items-center gap-3 sm:gap-5 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
                                    <div className={cn("p-4 rounded-2xl", stat.bg)}>
                                        <stat.icon className={cn("w-7 h-7", stat.color)} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                                        <p className="text-3xl font-black text-slate-900 tracking-tighter">{stat.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Charts and Portfolio Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-12">
                            <div className="lg:col-span-2 space-y-8">
                                <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 h-full">
                                    <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
                                        <TrendingUp className="w-6 h-6 text-primary" />
                                        Tendencia de Recaudación
                                    </h3>

                                    {/* Period Progress */}
                                    <div className="mb-10">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{currentMonthName}</span>
                                            <span className="text-xs font-black text-primary uppercase">{stats.collectionRate}% del objetivo</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-8 overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full flex items-center justify-end pr-3 transition-all duration-1000 shadow-inner shadow-black/5"
                                                style={{ width: `${Math.max(stats.collectionRate, 5)}%` }}
                                            >
                                                <span className="text-white text-[10px] font-black">{stats.collectionRate}%</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Simple Bar Chart */}
                                    <div className="flex items-end justify-between gap-4 h-48 px-2">
                                        {stats.history.map((h: any, i: number) => {
                                            const maxVal = Math.max(...stats.history.map((x: any) => x.value), 1);
                                            const height = (h.value / maxVal) * 100;
                                            return (
                                                <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                                                    <div className="w-full bg-slate-50 rounded-xl relative h-full flex items-end overflow-hidden border border-slate-50">
                                                        <div
                                                            className="w-full bg-primary/20 hover:bg-primary/40 transition-all rounded-t-lg relative"
                                                            style={{ height: `${height}%` }}
                                                        >
                                                            {h.value > 0 && (
                                                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                                    ${Math.round(h.value).toLocaleString()}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <span className="text-[9px] font-black text-slate-400 tracking-tighter">{h.label}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-1">
                                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col h-full">
                                    <h3 className="text-lg font-black text-slate-900 mb-8 flex items-center gap-2">
                                        <Shield className="w-5 h-5 text-primary" />
                                        Cartera Actual
                                    </h3>
                                    <div className="space-y-6 flex-1">
                                        {Object.entries(stats.byType || {}).map(([type, count]: [any, any]) => {
                                            const TYPE_CONFIG: any = {
                                                auto: { label: "Automotor", icon: Car, color: "text-blue-600", bg: "bg-blue-500" },
                                                hogar: { label: "Hogar", icon: Home, color: "text-violet-600", bg: "bg-violet-500" },
                                                vida: { label: "Vida", icon: Heart, color: "text-rose-600", bg: "bg-rose-500" },
                                                comercio: { label: "Comercio", icon: Store, color: "text-amber-600", bg: "bg-amber-500" },
                                                otro: { label: "Otro", icon: HelpCircle, color: "text-slate-600", bg: "bg-slate-500" },
                                            };
                                            const config = TYPE_CONFIG[type] || TYPE_CONFIG.otro;
                                            const total = Object.values(stats.byType).reduce((a: any, b: any) => a + b, 0) as number;
                                            const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                                            return (
                                                <div key={type} className="group">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase">
                                                            <config.icon className={cn("w-4 h-4", config.color)} />
                                                            {config.label}
                                                        </span>
                                                        <span className="text-[10px] font-black text-slate-400 uppercase">{count}</span>
                                                    </div>
                                                    <div className="w-full bg-slate-50 rounded-full h-1.5 overflow-hidden">
                                                        <div
                                                            className={cn("h-full rounded-full transition-all duration-1000", config.bg)}
                                                            style={{ width: `${percentage}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-1">
                                <UpcomingPaymentsAlerts />
                            </div>
                        </div>

                        {/* Recent Movements - Now as a footer list */}
                        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                            <h3 className="text-sm font-black text-slate-900 mb-8 flex items-center gap-3 uppercase tracking-widest">
                                <RefreshCw className="w-5 h-5 text-primary" />
                                Últimos Movimientos de Cobranza
                            </h3>
                            {stats.recentPayments.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">
                                                <th className="px-4 py-3">Asegurado</th>
                                                <th className="px-4 py-3">Estado</th>
                                                <th className="px-4 py-3 text-right">Importe</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {stats.recentPayments.map((payment: any, i: number) => {
                                                const style = getMovementStyle(payment.status);
                                                return (
                                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                                                        <td className="px-4 py-4">
                                                            <p className="text-xs font-black text-slate-900 uppercase">
                                                                {payment.clients?.full_name || "Cliente"}
                                                            </p>
                                                            <p className="text-[10px] text-slate-400 font-bold">
                                                                DNI {payment.clients?.dni}
                                                            </p>
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <div className={cn(
                                                                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm",
                                                                style.bg, style.color, "border-transparent"
                                                            )}>
                                                                {payment.status === 'paid' ? 'COBRADO' : payment.status === 'overdue' ? 'VENCIDO' : 'PENDIENTE'}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 text-right font-black text-slate-700 text-xs">
                                                            ${Math.round(payment.amount).toLocaleString()}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-xs text-slate-400 font-medium italic text-center py-10 opacity-60">
                                    No hay movimientos registrados para este periodo
                                </p>
                            )}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
