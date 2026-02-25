"use client";

import { useState, useEffect } from "react";
import { X, User, IdCard, Phone, Loader2, Pencil, ShieldPlus, Building2, Car } from "lucide-react";
import { toast } from "sonner";
import { updateClientAction } from "@/app/actions/clients";
import { updatePolicyAction } from "@/app/actions/policies";
import { supabase } from "@/lib/supabase";

interface EditClientDialogProps {
    isOpen: boolean;
    onClose: () => void;
    client: any; // Contains .policies[]
}

const POLICY_TYPES = [
    { value: "auto", label: "Automotor 🚗" },
    { value: "hogar", label: "Hogar 🏠" },
    { value: "vida", label: "Vida ❤️" },
    { value: "comercio", label: "Comercio 🏪" },
    { value: "otro", label: "Otro" },
];

export default function EditClientDialog({ isOpen, onClose, client }: EditClientDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [companies, setCompanies] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        full_name: client?.full_name || "",
        dni: client?.dni || "",
        phone: client?.phone || "",
    });

    const activePolicy = client?.policies?.[0] || null;

    const [policyData, setPolicyData] = useState({
        type: activePolicy?.type || "auto",
        company: activePolicy?.company || "",
        dominio: activePolicy?.dominio || "",
    });

    useEffect(() => {
        if (isOpen) {
            setFormData({
                full_name: client?.full_name || "",
                dni: client?.dni || "",
                phone: client?.phone || "",
            });
            const p = client?.policies?.[0] || null;
            setPolicyData({
                type: p?.type || "auto",
                company: p?.company || "",
                dominio: p?.dominio || "",
            });

            supabase.from("system_settings").select("companies").eq("id", "global").single()
                .then(({ data }) => {
                    const loaded = data?.companies || ["La Segunda", "RUS", "San Cristobal", "Sancor"];
                    setCompanies(loaded);
                    if (p && !p.company) {
                        setPolicyData(prev => ({ ...prev, company: loaded[0] || "" }));
                    }
                });
        }
    }, [isOpen, client]);

    const formatDNI = (val: string) => {
        const num = val.replace(/\D/g, "");
        return num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };

    if (!isOpen || !client) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Update Client
            const resultClient = await updateClientAction(client.id, {
                ...formData,
                full_name: formData.full_name.toUpperCase()
            });

            if (!resultClient.success) {
                toast.error(resultClient.error || "Error al actualizar asegurado");
                setIsSubmitting(false);
                return;
            }

            // Update Policy if exists
            if (activePolicy) {
                const resultPolicy = await updatePolicyAction(activePolicy.id, policyData);
                if (!resultPolicy.success) {
                    toast.error(`Asegurado actualizado, pero sin éxito en póliza: ${resultPolicy.error}`);
                    setIsSubmitting(false);
                    return;
                }
            }

            toast.success(`${formData.full_name.toUpperCase()} actualizado correctamente`);
            onClose();
        } catch {
            toast.error("Error inesperado al guardar cambios");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b bg-slate-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-amber-50 p-2.5 rounded-xl text-amber-600">
                            <Pencil className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 leading-tight">Editar Asegurado</h2>
                            <p className="text-[10px] text-primary font-black uppercase tracking-widest mt-0.5">DNI {client.dni} • {client.full_name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[75vh] overflow-y-auto no-scrollbar">
                    {/* CLIENT FIELDS */}
                    <div className="space-y-6">
                        <div className="space-y-2 text-left">
                            <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                                <User className="w-3.5 h-3.5" /> Nombre y Apellido
                            </label>
                            <input
                                required type="text" placeholder="GARCIA JUAN"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold text-slate-900 uppercase shadow-inner"
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2 text-left">
                                <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                                    <IdCard className="w-3.5 h-3.5" /> DNI
                                </label>
                                <input
                                    required type="text" placeholder="30123456"
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
                                    type="tel" placeholder="+54 9 11 ..."
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold text-slate-900 shadow-inner"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* POLICY FIELDS */}
                    {activePolicy && (
                        <div className="pt-6 border-t border-slate-100 space-y-6">
                            <h3 className="text-sm font-black text-emerald-800 uppercase tracking-widest flex items-center gap-2 bg-emerald-50 w-fit px-3 py-1.5 rounded-lg border border-emerald-100">
                                <ShieldPlus className="w-4 h-4" /> Póliza Actual
                            </h3>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                                        <ShieldPlus className="w-3.5 h-3.5" /> Tipo
                                    </label>
                                    <select
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold text-slate-900 shadow-inner"
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
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold text-slate-900 shadow-inner"
                                        value={policyData.company}
                                        onChange={(e) => setPolicyData({ ...policyData, company: e.target.value })}
                                    >
                                        {!companies.includes(policyData.company) && policyData.company && (
                                            <option value={policyData.company}>{policyData.company}</option>
                                        )}
                                        {companies.map((c) => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>

                                {policyData.type === "auto" && (
                                    <div className="space-y-2 col-span-2">
                                        <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                                            <Car className="w-3.5 h-3.5" /> Dominio (Patente)
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Ej: AB123CD"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold text-slate-900 uppercase shadow-inner"
                                            value={policyData.dominio}
                                            onChange={(e) => setPolicyData({ ...policyData, dominio: e.target.value })}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="pt-6 border-t flex gap-4">
                        <button type="button" disabled={isSubmitting} onClick={onClose}
                            className="flex-1 px-6 py-4 border border-slate-200 rounded-2xl font-black text-slate-600 hover:bg-slate-50 transition-all uppercase tracking-widest text-xs disabled:opacity-50">
                            Cancelar
                        </button>
                        <button type="submit" disabled={isSubmitting}
                            className="flex-1 px-6 py-4 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2 disabled:opacity-50">
                            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : "Guardar Cambios"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
