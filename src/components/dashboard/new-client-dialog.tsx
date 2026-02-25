"use client";

import { useState, useEffect } from "react";
import { X, User, IdCard, Phone, Plus, Loader2, ShieldPlus, Building2, Car, Calendar, Layers, FileText } from "lucide-react";
import { toast } from "sonner";
import { createClientAction } from "@/app/actions/clients";
import { createPolicyAction } from "@/app/actions/policies";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface NewClientDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

const POLICY_TYPES = [
    { value: "auto", label: "Automotor 🚗" },
    { value: "hogar", label: "Hogar 🏠" },
    { value: "vida", label: "Vida ❤️" },
    { value: "comercio", label: "Comercio 🏪" },
    { value: "otro", label: "Otro" },
];

export default function NewClientDialog({ isOpen, onClose }: NewClientDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [createPolicy, setCreatePolicy] = useState(false);
    const [companies, setCompanies] = useState<string[]>([]);

    // Client state
    const [formData, setFormData] = useState({
        full_name: "",
        dni: "",
        phone: "+54",
    });

    // Policy state
    const [policyData, setPolicyData] = useState({
        type: "auto",
        company: "",
        dominio: "",
        start_date: new Date().toISOString().split("T")[0],
        installments: 12,
        notes: "",
    });

    useEffect(() => {
        if (isOpen) {
            supabase.from("system_settings").select("companies").eq("id", "global").single()
                .then(({ data }) => {
                    const loaded = data?.companies || ["La Segunda", "RUS", "San Cristobal", "Sancor"];
                    setCompanies(loaded);
                    setPolicyData(prev => ({ ...prev, company: loaded[0] || "" }));
                });
        }
    }, [isOpen]);

    const formatDNI = (val: string) => {
        const num = val.replace(/\D/g, "");
        return num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };

    if (!isOpen) return null;

    const endDatePreview = (() => {
        if (!policyData.start_date || !policyData.installments) return "";
        const d = new Date(policyData.start_date);
        d.setMonth(d.getMonth() + policyData.installments);
        return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
    })();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // 1. Create client
            const result = await createClientAction({
                ...formData,
                full_name: formData.full_name.toUpperCase()
            });

            if (result.success && result.data?.id) {
                // 2. Optionally create policy
                if (createPolicy) {
                    const timestamp = Date.now().toString(36).toUpperCase();
                    const policy_number = `POL-${timestamp}`;

                    const policyResult = await createPolicyAction({
                        client_id: result.data.id,
                        policy_number,
                        ...policyData,
                        monthly_amount: 0,
                    });

                    if (policyResult.success) {
                        toast.success(`${formData.full_name.toUpperCase()} y su póliza creados`);
                    } else {
                        toast.error(`Cliente guardado pero error en póliza: ${policyResult.error}`);
                    }
                } else {
                    toast.success(`${formData.full_name.toUpperCase()} registrado con éxito`);
                }

                // Reset
                setFormData({ full_name: "", dni: "", phone: "+54" });
                setCreatePolicy(false);
                setPolicyData({
                    type: "auto", company: companies[0] || "La Segunda", dominio: "",
                    start_date: new Date().toISOString().split("T")[0],
                    installments: 12, notes: "",
                });
                onClose();
            } else {
                toast.error(result.error || "Error al crear el cliente");
            }
        } catch {
            toast.error("Ocurrió un error inesperado al guardar");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className={cn(
                "bg-white w-full rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300 transition-all max-h-[90vh] flex flex-col",
                createPolicy ? "max-w-3xl" : "max-w-xl"
            )}>
                <div className="p-6 border-b bg-slate-50/50 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2.5 rounded-xl text-primary">
                            <Plus className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 leading-tight">Nuevo Asegurado</h2>
                            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Registro en Gestión Pro</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="overflow-y-auto w-full p-8 scrollbar-hide">
                    <form id="new-client-form" onSubmit={handleSubmit} className="space-y-8">

                        {/* 1. SECCIÓN CLIENTE */}
                        <div className="space-y-6">
                            <div className="space-y-2 text-left">
                                <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                                    <User className="w-3.5 h-3.5" /> Nombre y Apellido
                                </label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Ej: GARCIA JUAN"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold text-slate-900 uppercase placeholder:normal-case shadow-inner"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2 text-left">
                                    <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                                        <IdCard className="w-3.5 h-3.5" /> DNI
                                    </label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Ej: 30123456"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all font-mono font-bold text-slate-900 shadow-inner"
                                        value={formData.dni}
                                        onChange={(e) => setFormData({ ...formData, dni: formatDNI(e.target.value) })}
                                    />
                                </div>

                                <div className="space-y-2 text-left">
                                    <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                                        <Phone className="w-3.5 h-3.5" /> Teléfono
                                    </label>
                                    <input
                                        type="tel"
                                        placeholder="+54 9 11 ..."
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold text-slate-900 shadow-inner"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* TOGGLE PÓLIZA */}
                        <div className="pt-2">
                            <label className="flex items-center gap-3 p-4 border border-emerald-200 bg-emerald-50 rounded-2xl cursor-pointer hover:bg-emerald-100/50 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={createPolicy}
                                    onChange={(e) => setCreatePolicy(e.target.checked)}
                                    className="w-5 h-5 text-emerald-600 rounded cursor-pointer accent-emerald-600 outline-none focus:ring-emerald-500 focus:ring-2 focus:ring-offset-2"
                                />
                                <div className="flex flex-col">
                                    <span className="text-sm font-black text-emerald-900 flex items-center gap-2">
                                        <ShieldPlus className="w-4 h-4 text-emerald-600" /> Registar también su primera Póliza ahora
                                    </span>
                                    <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">
                                        Opcional. Crea la póliza y sus cuotas automáticamente.
                                    </span>
                                </div>
                            </label>
                        </div>

                        {/* 2. SECCIÓN PÓLIZA (CONDICIONAL) */}
                        {createPolicy && (
                            <div className="pt-6 border-t border-emerald-100 space-y-6 animate-in slide-in-from-top-4 duration-300">
                                <h3 className="text-sm font-black text-emerald-800 uppercase tracking-widest flex items-center gap-2">
                                    Datos de la Nueva Póliza
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                                            <ShieldPlus className="w-3.5 h-3.5" /> Tipo de Seguro
                                        </label>
                                        <select
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold text-slate-900 appearance-none shadow-inner"
                                            value={policyData.type}
                                            onChange={(e) => setPolicyData({ ...policyData, type: e.target.value })}
                                        >
                                            {POLICY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                                            <Building2 className="w-3.5 h-3.5" /> Compañía
                                        </label>
                                        <select
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold text-slate-900 appearance-none shadow-inner"
                                            value={policyData.company}
                                            onChange={(e) => setPolicyData({ ...policyData, company: e.target.value })}
                                        >
                                            {companies.map((c) => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                                            <Car className="w-3.5 h-3.5" /> Dominio (Patente)
                                        </label>
                                        <input
                                            type="text" placeholder="Ej: ABC 123"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold text-slate-900 uppercase shadow-inner"
                                            value={policyData.dominio}
                                            onChange={(e) => setPolicyData({ ...policyData, dominio: e.target.value.toUpperCase() })}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                                            <Calendar className="w-3.5 h-3.5" /> Inicio de Vigencia
                                        </label>
                                        <input
                                            required={createPolicy} type="date"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold text-slate-900 shadow-inner"
                                            value={policyData.start_date}
                                            onChange={(e) => setPolicyData({ ...policyData, start_date: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-2 md:col-span-2 text-left">
                                        <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                                            <Layers className="w-3.5 h-3.5" /> Cantidad de Cuotas
                                        </label>
                                        <input
                                            required={createPolicy} type="number" min="1" max="48"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold text-slate-900 shadow-inner"
                                            value={policyData.installments}
                                            onChange={(e) => setPolicyData({ ...policyData, installments: parseInt(e.target.value) || 1 })}
                                        />
                                    </div>

                                    {policyData.installments > 0 && (
                                        <div className="md:col-span-2 bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 text-center">
                                            <p className="text-[10px] font-black text-emerald-600/80 uppercase tracking-wider mb-1">Fin de Vigencia Estimado</p>
                                            <p className="text-lg font-black text-emerald-800">{endDatePreview}</p>
                                        </div>
                                    )}

                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                                            <FileText className="w-3.5 h-3.5" /> Observaciones
                                        </label>
                                        <textarea
                                            rows={2} placeholder="Notas adicionales sobre la póliza..."
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold text-slate-900 shadow-inner resize-none"
                                            value={policyData.notes}
                                            onChange={(e) => setPolicyData({ ...policyData, notes: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                    </form>
                </div>

                {/* FOOTER ACTIONS */}
                <div className="p-6 border-t bg-slate-50 flex gap-4 shrink-0">
                    <button
                        type="button" disabled={isSubmitting} onClick={onClose}
                        className="flex-1 px-6 py-4 border border-slate-200 bg-white rounded-2xl font-black text-slate-600 hover:bg-slate-50 transition-all uppercase tracking-widest text-xs disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        form="new-client-form"
                        type="submit" disabled={isSubmitting}
                        className="flex-1 px-6 py-4 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : (createPolicy ? `Guardar Cliente y Póliza` : `Guardar Cliente`)}
                    </button>
                </div>

            </div>
        </div>
    );
}

