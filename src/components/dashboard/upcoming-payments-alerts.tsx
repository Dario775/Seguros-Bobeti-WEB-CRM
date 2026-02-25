"use client";

import { useState, useEffect } from "react";
import {
    Clock,
    DollarSign,
    MessageCircle,
    Loader2,
    Calendar,
    ChevronRight,
    Wallet
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getUpcomingPaymentsAction } from "@/app/actions/payments";
import { getSystemSettings } from "@/app/actions/settings";
import Link from "next/link";

export default function UpcomingPaymentsAlerts() {
    const [loading, setLoading] = useState(true);
    const [alerts, setAlerts] = useState<any[]>([]);
    const [alertDays, setAlertDays] = useState(5);
    const [messageTemplate, setMessageTemplate] = useState('');

    const fetchAlerts = async () => {
        setLoading(true);
        try {
            const [alertRes, settingsRes] = await Promise.all([
                getUpcomingPaymentsAction(),
                getSystemSettings()
            ]);

            if (alertRes.success) {
                setAlerts(alertRes.data);
            }
            if (settingsRes.success && settingsRes.data) {
                setAlertDays(settingsRes.data.payment_alert_days);
                setMessageTemplate(settingsRes.data.payment_message_template || '');
            }
        } catch (err) {
            console.error("Fetch payment alerts error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAlerts(); }, []);

    const formatAmount = (amount: number) => {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
    };

    const daysUntil = (dateStr: string) => {
        const today = new Date();
        const end = new Date(dateStr + "T00:00:00");
        const diffTime = end.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const sendWhatsApp = (phone: string, clientName: string, amount: number, dueDate: string) => {
        const dateObj = new Date(dueDate + "T00:00:00");
        const day = dateObj.getDate();
        const month = dateObj.toLocaleDateString("es-AR", { month: "long" }).toUpperCase();
        const year = dateObj.getFullYear();
        const dateFormatted = `${day} de ${month} ${year}`;

        const amountFormatted = formatAmount(amount);

        let message = messageTemplate || `Hola {nombre}! Te recordamos que el pago de tu cuota vence el día {fecha}. Agencia La Segunda.`;

        message = message
            .replace(/{ ?nombre ?}|\[ ?nombre ?\]/gi, clientName)
            .replace(/{ ?fecha ?}|\[ ?fecha ?\]/gi, dateFormatted);

        window.open(`https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`, "_blank");
    };

    if (loading) {
        return (
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col items-center justify-center min-h-[300px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" />
                <p className="text-xs font-bold text-slate-400 mt-4 uppercase tracking-widest italic">Buscando cobros...</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow">
            <div className="p-6 border-b bg-amber-50/30 flex items-center justify-between">
                <h3 className="text-sm font-black text-amber-600 flex items-center gap-2 uppercase tracking-tighter">
                    <Wallet className="w-5 h-5" />
                    Cobros Próximos
                </h3>
                <span className="bg-amber-100 text-amber-600 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                    VENCE EN {alertDays} DÍAS
                </span>
            </div>

            <div className="flex-1 overflow-auto max-h-[400px]">
                {alerts.length > 0 ? (
                    <div className="divide-y divide-slate-50">
                        {alerts.map((installment) => {
                            const days = daysUntil(installment.due_date);
                            const policy = installment.policies;
                            const client = policy?.clients;
                            return (
                                <div key={installment.id} className="p-5 hover:bg-slate-50/50 transition-colors group">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-1">
                                            <p className="text-sm font-black text-slate-900 uppercase">
                                                {client?.full_name}
                                            </p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                {policy?.type} • PAGO ${installment.amount}
                                            </p>
                                        </div>
                                        <div className={cn(
                                            "px-2.5 py-1 rounded-xl text-center min-w-[70px]",
                                            days <= 1 ? "bg-rose-50 text-rose-600 border border-rose-100" :
                                                days <= 3 ? "bg-amber-50 text-amber-600 border border-amber-100" :
                                                    "bg-blue-50 text-blue-600 border border-blue-100"
                                        )}>
                                            <p className="text-[10px] font-black leading-tight uppercase">
                                                {days === 0 ? "Hoy" : days === 1 ? "Mañana" : `En ${days} días`}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400" suppressHydrationWarning>
                                            <Calendar className="w-3.5 h-3.5" />
                                            Vence {new Date(installment.due_date + "T00:00:00").toLocaleDateString("es-AR")}
                                        </div>

                                        {client?.phone && (
                                            <button
                                                onClick={() => sendWhatsApp(client.phone, client.full_name, installment.amount, installment.due_date)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:shadow-lg transition-all active:scale-95"
                                            >
                                                <MessageCircle className="w-3.5 h-3.5" />
                                                Avisar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="p-12 text-center text-slate-300">
                        <Clock className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p className="text-xs font-bold uppercase tracking-widest italic">No hay cobros urgentes</p>
                    </div>
                )}
            </div>

            <div className="p-4 border-t bg-slate-50/50">
                <Link
                    href="/dashboard/cobranzas"
                    className="flex items-center justify-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                >
                    Ver Matriz de Cobranza
                    <ChevronRight className="w-3.5 h-3.5" />
                </Link>
            </div>
        </div>
    );
}
