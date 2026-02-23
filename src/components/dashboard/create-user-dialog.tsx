"use client";

import { useState } from "react";
import {
    X,
    User,
    Mail,
    Lock,
    Shield,
    Loader2,
    Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createUserAction } from "@/app/actions/users";
import { useRouter } from "next/navigation";

interface CreateUserDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CreateUserDialog({ isOpen, onClose }: CreateUserDialogProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        password: "",
        role: "viewer",
        permissions: { dashboard: true, clientes: true, asegurar: true, cobranzas: true } as Record<string, boolean>
    });

    if (!isOpen) return null;

    const togglePerm = (key: string) => {
        setFormData({
            ...formData,
            permissions: { ...formData.permissions, [key]: !formData.permissions[key] }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const result = await createUserAction(formData);

            if (result.success) {
                toast.success(`Usuario ${formData.full_name} creado correctamente`);
                setFormData({
                    full_name: "",
                    email: "",
                    password: "",
                    role: "viewer",
                    permissions: { dashboard: true, clientes: true, asegurar: true, cobranzas: true }
                });
                onClose();
                router.refresh();
            } else {
                toast.error(result.error || "Error al crear el usuario");
            }
        } catch (error) {
            toast.error("Ocurrió un error inesperado");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-8 border-b bg-slate-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="bg-primary/10 p-3 rounded-2xl text-primary">
                            <Plus className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 leading-tight">Registrar Staff</h2>
                            <p className="text-[10px] text-primary font-black uppercase tracking-widest mt-0.5">Control de Accesos Autorizado</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-400 transition-all hover:scale-110"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-5">
                        {/* Full Name */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                                <User className="w-3.5 h-3.5" /> Nombre y Apellido
                            </label>
                            <input
                                required
                                type="text"
                                placeholder="Ej: Dario Martinez"
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold text-slate-900 shadow-inner"
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            />
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                                <Mail className="w-3.5 h-3.5" /> Correo Electrónico
                            </label>
                            <input
                                required
                                type="email"
                                placeholder="usuario@agencia.com"
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold text-slate-900 shadow-inner"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                                <Lock className="w-3.5 h-3.5" /> Contraseña Provisoria
                            </label>
                            <input
                                required
                                type="password"
                                placeholder="••••••••"
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold text-slate-900 shadow-inner"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>

                        {/* Role Selection */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                                <Shield className="w-3.5 h-3.5" /> Rol y Permisos
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { id: "admin", label: "Admin Agencia", desc: "Gestión completa" },
                                    { id: "cobrador", label: "Cobrador", desc: "Solo cobranzas" },
                                    { id: "viewer", label: "Auditor", desc: "Solo lectura" },
                                    { id: "super_admin", label: "Super Admin", desc: "Control total" }
                                ].map((r) => (
                                    <button
                                        key={r.id}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, role: r.id })}
                                        className={cn(
                                            "p-4 rounded-2xl border-2 text-left transition-all relative overflow-hidden group",
                                            formData.role === r.id
                                                ? "border-primary bg-primary/5 ring-4 ring-primary/5"
                                                : "border-slate-100 bg-white hover:border-slate-200"
                                        )}
                                    >
                                        <p className={cn(
                                            "text-xs font-black uppercase tracking-tight",
                                            formData.role === r.id ? "text-primary" : "text-slate-600"
                                        )}>{r.label}</p>
                                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">{r.desc}</p>
                                        {formData.role === r.id && (
                                            <div className="absolute top-2 right-2 w-4 h-4 bg-primary text-white rounded-full flex items-center justify-center">
                                                <UserCheck className="w-2.5 h-2.5" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Granular Permissions Section */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                                <Shield className="w-3.5 h-3.5" /> Permisos Específicos
                            </label>
                            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                                {[
                                    { key: "clientes_crear", label: "Crear Clientes" },
                                    { key: "polizas_crear", label: "Crear Pólizas" },
                                    { key: "pagos_editar", label: "Registrar Pagos" },
                                    { key: "usuarios_gestionar", label: "Gestionar Staff" }
                                ].map((perm) => (
                                    <div
                                        key={perm.key}
                                        onClick={() => togglePerm(perm.key)}
                                        className={cn(
                                            "flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all",
                                            formData.permissions[perm.key]
                                                ? "bg-white border-primary/20 text-slate-900"
                                                : "bg-slate-50 border-slate-100 text-slate-400"
                                        )}
                                    >
                                        <span className="text-[9px] font-black uppercase tracking-tight">{perm.label}</span>
                                        {formData.permissions[perm.key] ? (
                                            <div className="w-3.5 h-3.5 bg-primary rounded-full flex items-center justify-center">
                                                <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                            </div>
                                        ) : (
                                            <div className="w-3.5 h-3.5 bg-slate-200 rounded-full" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t flex gap-4">
                        <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={onClose}
                            className="flex-1 px-8 py-4 border border-slate-200 rounded-2xl font-black text-slate-600 hover:bg-slate-50 transition-all uppercase tracking-widest text-[10px] text-center"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-8 py-4 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                                    Procesando...
                                </>
                            ) : (
                                "Crear Usuario"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function UserCheck({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
    );
}
