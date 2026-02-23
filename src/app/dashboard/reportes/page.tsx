"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/dashboard/sidebar";
import {
    BarChart3,
    Calendar,
    ChevronDown,
    Download,
    Loader2,
    Printer,
    RefreshCw,
    TrendingUp,
    TrendingDown,
    CheckCircle2,
    Clock,
    User,
    Shield,
    FileText,
    PieChart,
    Car,
    Home,
    Heart,
    Store,
    HelpCircle
} from "lucide-react";
import { cn, formatCurrency, getMonthName } from "@/lib/utils";
import { getMonthlyReportAction } from "@/app/actions/payments";
import { toast } from "sonner";

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
    auto: { label: "Automotor", icon: Car, color: "text-blue-600", bg: "bg-blue-50" },
    hogar: { label: "Hogar", icon: Home, color: "text-violet-600", bg: "bg-violet-50" },
    vida: { label: "Vida", icon: Heart, color: "text-rose-600", bg: "bg-rose-50" },
    comercio: { label: "Comercio", icon: Store, color: "text-amber-600", bg: "bg-amber-50" },
    otro: { label: "Otro", icon: HelpCircle, color: "text-slate-600", bg: "bg-slate-50" },
};

export default function ReportesPage() {
    const currentYear = new Date().getFullYear();
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [loading, setLoading] = useState(true);
    const [report, setReport] = useState<any>(null);

    const fetchReport = async () => {
        setLoading(true);
        const result = await getMonthlyReportAction(selectedMonth, selectedYear);
        if (result.success) {
            setReport(result.data);
        } else {
            toast.error("Error al generar el reporte");
        }
        setLoading(false);
    };

    useEffect(() => { fetchReport(); }, [selectedMonth, selectedYear]);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="flex min-h-screen bg-slate-50/50 print:bg-white">
            <div className="print:hidden">
                <Sidebar />
            </div>

            <main className="flex-1 p-8 print:p-0">
                <header className="mb-10 flex items-center justify-between print:hidden">
                    <div>
                        <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
                            <BarChart3 className="w-8 h-8 text-primary" />
                            Reportes Mensuales
                        </h2>
                        <p className="text-muted-foreground font-medium mt-1">Análisis de rendimiento y cobranza por periodo</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex bg-white border border-slate-200 rounded-2xl p-1 shadow-sm">
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                className="bg-transparent px-4 py-2 text-sm font-black text-slate-700 outline-none border-r border-slate-100"
                            >
                                {Array.from({ length: 12 }).map((_, i) => (
                                    <option key={i + 1} value={i + 1}>{getMonthName(i)}</option>
                                ))}
                            </select>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                className="bg-transparent px-4 py-2 text-sm font-black text-slate-700 outline-none"
                            >
                                <option value={currentYear}>{currentYear}</option>
                                <option value={currentYear - 1}>{currentYear - 1}</option>
                            </select>
                        </div>

                        <button
                            onClick={handlePrint}
                            className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-primary transition-all hover:shadow-md"
                        >
                            <Printer className="w-5 h-5" />
                        </button>
                    </div>
                </header>

                {/* Print Only Header */}
                <div className="hidden print:block mb-10 text-center border-b pb-8">
                    <h1 className="text-4xl font-black text-slate-900 uppercase">La Segunda Seguros</h1>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-2">Agencia Digital - Reporte de Gestión</p>
                    <div className="mt-6 inline-block bg-slate-100 px-6 py-2 rounded-full">
                        <span className="text-lg font-black uppercase">{getMonthName(selectedMonth - 1)} {selectedYear}</span>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 text-slate-400">
                        <Loader2 className="w-12 h-12 animate-spin mb-4 text-primary" />
                        <p className="font-bold italic">Analizando datos del periodo...</p>
                    </div>
                ) : report && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        {/* KPI Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Recaudado</p>
                                <div className="flex items-center gap-3">
                                    <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600">
                                        <TrendingUp className="w-4 h-4" />
                                    </div>
                                    <p className="text-3xl font-black text-slate-900">${Math.round(report.summary.totalCollected).toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pendiente Cobro</p>
                                <div className="flex items-center gap-3">
                                    <div className="bg-amber-50 p-2 rounded-xl text-amber-600">
                                        <Clock className="w-4 h-4" />
                                    </div>
                                    <p className="text-3xl font-black text-slate-900">${Math.round(report.summary.totalPending).toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Efectividad</p>
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-50 p-2 rounded-xl text-blue-600">
                                        <PieChart className="w-4 h-4" />
                                    </div>
                                    <p className="text-3xl font-black text-slate-900">
                                        {report.summary.totalTransactions > 0
                                            ? Math.round((report.summary.countPaid / report.summary.totalTransactions) * 100)
                                            : 0}%
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Transacciones</p>
                                <div className="flex items-center gap-3">
                                    <div className="bg-purple-50 p-2 rounded-xl text-purple-600">
                                        <FileText className="w-4 h-4" />
                                    </div>
                                    <p className="text-3xl font-black text-slate-900">{report.summary.totalTransactions}</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Type Distribution */}
                            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col">
                                <h3 className="text-lg font-black text-slate-900 mb-8 flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-primary" />
                                    Distribución de Cartera
                                </h3>
                                <div className="space-y-6 flex-1">
                                    {Object.entries(report.byType).map(([type, count]: [any, any]) => {
                                        const config = TYPE_CONFIG[type] || TYPE_CONFIG.otro;
                                        const percentage = Math.round((count / Object.values(report.byType).reduce((a: any, b: any) => a + b, 0) as number) * 100);
                                        return (
                                            <div key={type} className="group">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase">
                                                        <config.icon className={cn("w-4 h-4", config.color)} />
                                                        {config.label}
                                                    </span>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase">{count} pólizas</span>
                                                </div>
                                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                                    <div
                                                        className={cn("h-full rounded-full transition-all duration-1000", config.bg.replace("bg-", "bg-").replace("-50", "-500"))}
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Detailed List */}
                            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="p-6 border-b bg-slate-50/50 flex items-center justify-between">
                                    <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                        <User className="w-5 h-5 text-primary" />
                                        Detalle de Cobranza del Mes
                                    </h3>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{report.payments.length} REGISTROS</span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-slate-50/80 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">
                                                <th className="px-6 py-4">Asegurado</th>
                                                <th className="px-6 py-4">Estado</th>
                                                <th className="px-6 py-4 text-right">Importe</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {report.payments.map((p: any, i: number) => (
                                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <p className="text-sm font-black text-slate-900 uppercase">{p.clients?.full_name}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">DNI {p.clients?.dni}</p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className={cn(
                                                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                                                            p.status === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                                p.status === 'overdue' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                                    'bg-amber-50 text-amber-600 border-amber-100'
                                                        )}>
                                                            {p.status === 'paid' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                                            {p.status === 'paid' ? 'COBRADO' : p.status === 'overdue' ? 'VENCIDO' : 'PENDIENTE'}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-black text-slate-700">
                                                        ${Math.round(p.amount).toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Footer disclaimer for printed report */}
                        <div className="hidden print:block pt-20 text-center text-[10px] text-slate-400 italic">
                            Reporte generado automáticamente por el Sistema de Gestión Digital. Fecha de emisión: {new Date().toLocaleString("es-AR")}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
