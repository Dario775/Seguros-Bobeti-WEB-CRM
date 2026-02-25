"use client";

import { useState } from "react";
import { X, DollarSign, Loader2, CheckCircle, Clock, AlertTriangle, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { registerPayment } from "@/app/actions/payments";
import { toast } from "sonner";

interface PaymentDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    clientName: string;
    clientId: string;
    month: number; // 1-12
    monthName: string;
    year: number;
    currentPayment?: {
        amount: number;
        status: string;
    } | null;
    policyAmount?: number;
}

const statusOptions = [
    { value: "paid", label: "Cobrado", icon: CheckCircle, color: "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500" },
    { value: "pending", label: "Pendiente", icon: Clock, color: "bg-amber-50 text-amber-700 border-amber-200 ring-amber-500" },
    { value: "overdue", label: "Vencido", icon: AlertTriangle, color: "bg-rose-50 text-rose-700 border-rose-200 ring-rose-500" },
    { value: "not_applicable", label: "No Aplica", icon: Ban, color: "bg-slate-50 text-slate-500 border-slate-200 ring-slate-400" },
];

export default function PaymentDialog({
    isOpen, onClose, onSuccess,
    clientName, clientId, month, monthName, year,
    currentPayment, policyAmount
}: PaymentDialogProps) {
    const effectiveAmount = currentPayment?.amount || policyAmount || 0;
    const [amount, setAmount] = useState(effectiveAmount ? effectiveAmount.toString() : "");
    const [status, setStatus] = useState(currentPayment?.status || "paid");
    const [saving, setSaving] = useState(false);
    const hasPolicy = !!policyAmount && policyAmount > 0;

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        const result = await registerPayment({
            client_id: clientId,
            year,
            month,
            amount: 0,
            status: status as any,
        });

        if (result.success) {
            toast.success(`Pago de ${monthName} registrado para ${clientName}`);
            onSuccess();
            onClose();
        } else {
            toast.error(result.error || "Error al registrar el pago");
        }

        setSaving(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-5 border-b bg-slate-50/50 flex items-center justify-between">
                    <div>
                        <h2 className="font-black text-slate-900 text-sm uppercase tracking-tight">{clientName}</h2>
                        <p className="text-[10px] text-primary font-black uppercase tracking-widest mt-0.5">
                            {monthName} {year} • Registro de Pago
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">


                    {/* Status Selector */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado del Pago</label>
                        <div className="grid grid-cols-2 gap-2">
                            {statusOptions.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setStatus(opt.value)}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-3 rounded-2xl border-2 font-black text-xs uppercase tracking-wide transition-all",
                                        status === opt.value
                                            ? `${opt.color} ring-2 scale-[1.02]`
                                            : "bg-white text-slate-400 border-slate-100 hover:border-slate-200"
                                    )}
                                >
                                    <opt.icon className="w-4 h-4" />
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="flex-1 px-4 py-3.5 border border-slate-200 rounded-2xl font-black text-slate-500 text-xs uppercase tracking-widest hover:bg-slate-50 transition-all disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 px-4 py-3.5 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar Pago"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
