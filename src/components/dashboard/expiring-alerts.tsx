"use client";

import { useState, useEffect } from "react";
import {
    AlertTriangle,
    Calendar,
    Phone,
    MessageCircle,
    ChevronRight,
    Loader2,
    ShieldAlert,
    ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getExpiringPoliciesAction } from "@/app/actions/policies";
import { getSystemSettings } from "@/app/actions/settings";
import Link from "next/link";

export default function ExpiringAlerts() {
    const [loading, setLoading] = useState(true);
    const [alerts, setAlerts] = useState<any[]>([]);
    const [alertDays, setAlertDays] = useState(15);
    const [messageTemplate, setMessageTemplate] = useState('');

    const fetchAlerts = async () => {
        setLoading(true);
        try {
            const [alertRes, settingsRes] = await Promise.all([
                getExpiringPoliciesAction(),
                getSystemSettings()
            ]);

            if (alertRes.success) {
                setAlerts(alertRes.data);
            }
            if (settingsRes.success && settingsRes.data) {
                setAlertDays(settingsRes.data.policy_alert_days);
                setMessageTemplate(settingsRes.data.policy_message_template || '');
            }
        } catch (err) {
            console.error("Fetch alerts error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAlerts(); }, []);

    const daysUntil = (dateStr: string) => {
        const today = new Date();
        const end = new Date(dateStr + "T00:00:00");
        const diffTime = end.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const sendWhatsApp = (phone: string, clientName: string, policyNumber: string, endDate: string) => {
        const date = new Date(endDate + "T00:00:00").toLocaleDateString("es-AR");

        let message = messageTemplate || `Hola {nombre}! Te recordamos que tu póliza N° {nro_poliza} de La Segunda Seguros está próxima a vencer el día {fecha}. ¿Deseas renovarla?`;

        message = message
            .replace(/{nombre}/g, clientName)
            .replace(/{fecha}/g, date)
            .replace(/{nro_poliza}/g, policyNumber);

        window.open(`https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`, "_blank");
    };

    if (loading) {
        return (
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col items-center justify-center min-h-[300px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" />
                <p className="text-xs font-bold text-slate-400 mt-4 uppercase tracking-widest italic">Buscando vencimientos...</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b bg-rose-50/30 flex items-center justify-between">
                <h3 className="text-sm font-black text-rose-600 flex items-center gap-2 uppercase tracking-tighter">
                    <ShieldAlert className="w-5 h-5" />
                    Alertas de Vencimiento
                </h3>
                <span className="bg-rose-100 text-rose-600 text-[10px] font-black px-2 py-0.5 rounded-full">
                    PRÓXIMOS {alertDays} DÍAS
                </span>
            </div>

            <div className="flex-1 overflow-auto max-h-[400px]">
                {alerts.length > 0 ? (
                    <div className="divide-y divide-slate-50">
                        {alerts.map((policy) => {
                            const days = daysUntil(policy.end_date);
                            const client = policy.clients;
                            return (
                                <div key={policy.id} className="p-5 hover:bg-slate-50/50 transition-colors group">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-black text-slate-900 uppercase">
                                                    {client?.full_name}
                                                </p>
                                                <Link
                                                    href={`/dashboard/clientes/${client?.id}`}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white border border-slate-200 rounded-lg"
                                                >
                                                    <ExternalLink className="w-3 h-3 text-primary" />
                                                </Link>
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                {policy.type} • N° {policy.policy_number}
                                            </p>
                                        </div>
                                        <div className={cn(
                                            "px-2.5 py-1 rounded-xl text-center min-w-[70px]",
                                            days <= 3 ? "bg-rose-50 text-rose-600 border border-rose-100" :
                                                days <= 7 ? "bg-amber-50 text-amber-600 border border-amber-100" :
                                                    "bg-blue-50 text-blue-600 border border-blue-100"
                                        )}>
                                            <p className="text-[10px] font-black leading-tight uppercase">En {days} días</p>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400" suppressHydrationWarning>
                                            <Calendar className="w-3.5 h-3.5" />
                                            {new Date(policy.end_date + "T00:00:00").toLocaleDateString("es-AR")}
                                        </div>

                                        {client?.phone && (
                                            <button
                                                onClick={() => sendWhatsApp(client.phone, client.full_name, policy.policy_number, policy.end_date)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/20 transition-all active:scale-95"
                                            >
                                                <MessageCircle className="w-3.5 h-3.5" />
                                                WhatsApp
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                            <Calendar className="w-8 h-8 text-slate-200" />
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">No hay vencimientos próximos</p>
                    </div>
                )}
            </div>

            <div className="p-4 border-t bg-slate-50/50">
                <Link
                    href="/dashboard/asegurar"
                    className="flex items-center justify-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                >
                    Ver todas las pólizas
                    <ChevronRight className="w-3.5 h-3.5" />
                </Link>
            </div>
        </div>
    );
}
