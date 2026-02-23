"use client";

import { useState } from "react";
import {
    X, Loader2, Shield, User, BarChart3, Users,
    ShieldPlus, TableProperties, ToggleLeft, ToggleRight,
    UserX, UserCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { updateUserAction } from "@/app/actions/users";

interface EditUserDialogProps {
    isOpen: boolean;
    onClose: () => void;
    user: any;
}

const FEATURES = [
    { key: "dashboard", label: "Dashboard", desc: "Panel principal con métricas", icon: BarChart3 },
    { key: "clientes", label: "Clientes", desc: "Gestión de asegurados", icon: Users },
    { key: "asegurar", label: "Asegurar", desc: "Pólizas y cuotas", icon: ShieldPlus },
    { key: "cobranzas", label: "Cobranzas", desc: "Matriz de pagos mensuales", icon: TableProperties },
];

const ROLES = [
    { id: "super_admin", label: "Super Admin", desc: "Control total del sistema", color: "border-purple-300 bg-purple-50 text-purple-700" },
    { id: "admin", label: "Admin Agencia", desc: "Gestión completa", color: "border-blue-300 bg-blue-50 text-blue-700" },
    { id: "cobrador", label: "Cobrador", desc: "Solo cobranzas", color: "border-emerald-300 bg-emerald-50 text-emerald-700" },
    { id: "viewer", label: "Auditor", desc: "Solo lectura", color: "border-slate-300 bg-slate-50 text-slate-600" },
];

const GRANULAR_PERMISSIONS = [
    { key: "clientes_crear", label: "Crear Clientes", module: "clientes" },
    { key: "clientes_editar", label: "Editar Clientes", module: "clientes" },
    { key: "clientes_eliminar", label: "Eliminar Clientes", module: "clientes" },
    { key: "polizas_crear", label: "Crear Pólizas", module: "asegurar" },
    { key: "polizas_editar", label: "Editar Pólizas", module: "asegurar" },
    { key: "polizas_eliminar", label: "Eliminar Pólizas", module: "asegurar" },
    { key: "pagos_editar", label: "Registrar Pagos", module: "cobranzas" },
    { key: "usuarios_gestionar", label: "Gestionar Usuarios", module: "configuracion" },
];

export default function EditUserDialog({ isOpen, onClose, user }: EditUserDialogProps) {
    const defaultPerms = { dashboard: true, clientes: true, asegurar: true, cobranzas: true };
    const [role, setRole] = useState(user?.role || "viewer");
    const [permissions, setPermissions] = useState<Record<string, boolean>>(
        user?.permissions || defaultPerms
    );
    const [isActive, setIsActive] = useState(user?.is_active ?? true);
    const [saving, setSaving] = useState(false);

    if (!isOpen || !user) return null;

    const togglePerm = (key: string) => {
        setPermissions({ ...permissions, [key]: !permissions[key] });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const result = await updateUserAction(user.id, {
                role,
                permissions,
                is_active: isActive,
            });

            if (result.success) {
                toast.success(`${user.full_name} actualizado correctamente`);
                onClose();
            } else {
                toast.error(result.error || "Error al actualizar");
            }
        } catch {
            toast.error("Error inesperado");
        } finally {
            setSaving(false);
        }
    };

    const enabledCount = Object.values(permissions).filter(Boolean).length;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="p-6 border-b bg-slate-50/50 flex items-center justify-between sticky top-0 bg-white z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary/20 to-primary/5 flex items-center justify-center font-black text-primary text-lg border border-primary/10">
                            {user.full_name?.charAt(0) || "U"}
                        </div>
                        <div>
                            <h2 className="font-black text-slate-900 text-sm uppercase tracking-tight">{user.full_name}</h2>
                            <p className="text-[10px] text-slate-400 font-bold">{user.username}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Active / Inactive Toggle */}
                    <div
                        onClick={() => setIsActive(!isActive)}
                        className={cn(
                            "flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all",
                            isActive
                                ? "bg-emerald-50 border-emerald-200"
                                : "bg-rose-50 border-rose-200"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            {isActive ? (
                                <UserCheck className="w-5 h-5 text-emerald-600" />
                            ) : (
                                <UserX className="w-5 h-5 text-rose-500" />
                            )}
                            <div>
                                <p className={cn("text-xs font-black uppercase tracking-wider", isActive ? "text-emerald-700" : "text-rose-700")}>
                                    {isActive ? "Usuario Activo" : "Usuario Deshabilitado"}
                                </p>
                                <p className="text-[10px] text-slate-400 font-bold">
                                    {isActive ? "Puede acceder al sistema" : "No puede iniciar sesión"}
                                </p>
                            </div>
                        </div>
                        {isActive ? (
                            <ToggleRight className="w-8 h-8 text-emerald-500" />
                        ) : (
                            <ToggleLeft className="w-8 h-8 text-rose-400" />
                        )}
                    </div>

                    {/* Role Selection */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Shield className="w-3.5 h-3.5" /> Rol del Usuario
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {ROLES.map((r) => (
                                <button
                                    key={r.id}
                                    type="button"
                                    onClick={() => setRole(r.id)}
                                    className={cn(
                                        "p-3 rounded-2xl border-2 text-left transition-all",
                                        role === r.id
                                            ? `${r.color} ring-2 ring-offset-1 ring-primary/20 scale-[1.02]`
                                            : "border-slate-100 bg-white hover:border-slate-200 text-slate-500"
                                    )}
                                >
                                    <p className="text-[11px] font-black uppercase tracking-tight">{r.label}</p>
                                    <p className="text-[9px] font-bold text-slate-400 mt-0.5">{r.desc}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Feature Permissions */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <User className="w-3.5 h-3.5" /> Funciones Habilitadas
                            </label>
                            <span className="text-[10px] font-black text-primary">{enabledCount}/{FEATURES.length} activas</span>
                        </div>

                        <div className="space-y-2">
                            {FEATURES.map((feat) => {
                                const enabled = permissions[feat.key] !== false;
                                const Icon = feat.icon;
                                return (
                                    <div
                                        key={feat.key}
                                        onClick={() => togglePerm(feat.key)}
                                        className={cn(
                                            "flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all group",
                                            enabled
                                                ? "bg-white border-slate-200 hover:border-primary/30"
                                                : "bg-slate-50 border-slate-100 opacity-50"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "p-2 rounded-xl transition-colors",
                                                enabled ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-400"
                                            )}>
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className={cn("text-xs font-black uppercase tracking-wider", enabled ? "text-slate-900" : "text-slate-400")}>
                                                    {feat.label}
                                                </p>
                                                <p className="text-[10px] text-slate-400 font-bold">{feat.desc}</p>
                                            </div>
                                        </div>
                                        {enabled ? (
                                            <ToggleRight className="w-7 h-7 text-primary" />
                                        ) : (
                                            <ToggleLeft className="w-7 h-7 text-slate-300" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Granular Permissions */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Shield className="w-3.5 h-3.5" /> Acciones Específicas
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {GRANULAR_PERMISSIONS.map((perm) => (
                                <div
                                    key={perm.key}
                                    onClick={() => togglePerm(perm.key)}
                                    className={cn(
                                        "flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all",
                                        permissions[perm.key]
                                            ? "bg-white border-primary/20 text-slate-900"
                                            : "bg-slate-50 border-slate-100 text-slate-400"
                                    )}
                                >
                                    <span className="text-[10px] font-black uppercase tracking-tight">{perm.label}</span>
                                    {permissions[perm.key] ? (
                                        <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                                            <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                        </div>
                                    ) : (
                                        <div className="w-4 h-4 bg-slate-200 rounded-full" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-4 border-t flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={saving}
                            className="flex-1 px-4 py-3.5 border border-slate-200 rounded-2xl font-black text-slate-500 text-xs uppercase tracking-widest hover:bg-slate-50 transition-all disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 px-4 py-3.5 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar Cambios"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
