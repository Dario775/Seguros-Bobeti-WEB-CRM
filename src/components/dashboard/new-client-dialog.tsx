"use client";

import { useState } from "react";
import { X, User, IdCard, Phone, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClientAction } from "@/app/actions/clients";

interface NewClientDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function NewClientDialog({ isOpen, onClose }: NewClientDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        full_name: "",
        dni: "",
        phone: "+54",
    });

    const formatDNI = (val: string) => {
        // Solo números
        const num = val.replace(/\D/g, "");
        // Formatear con puntos cada 3 dígitos
        return num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const result = await createClientAction({
                ...formData,
                full_name: formData.full_name.toUpperCase()
            });

            if (result.success) {
                toast.success(`${formData.full_name.toUpperCase()} registrado con éxito`);
                setFormData({ full_name: "", dni: "", phone: "+54" });
                onClose();
            } else {
                toast.error(result.error || "Error al crear el cliente");
            }
        } catch {
            toast.error("Ocurrió un error inesperado");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b bg-slate-50/50 flex items-center justify-between">
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

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
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

                    <div className="grid grid-cols-2 gap-6">
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

                    <div className="pt-6 border-t flex gap-4">
                        <button
                            type="button" disabled={isSubmitting} onClick={onClose}
                            className="flex-1 px-6 py-4 border border-slate-200 rounded-2xl font-black text-slate-600 hover:bg-slate-50 transition-all uppercase tracking-widest text-xs disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit" disabled={isSubmitting}
                            className="flex-1 px-6 py-4 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : "Guardar Cliente"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
