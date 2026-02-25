"use client";

import {
    Users,
    ShieldAlert,
    Settings2,
    UserPlus,
    Key,
    UserCheck,
    MoreVertical,
    Mail,
    Shield,
    Search,
    RefreshCw,
    Loader2,
    Bell,
    CreditCard,
    MessageSquare,
    ShieldCheck,
    Building2,
    Plus,
    X
} from "lucide-react";
import Sidebar from "@/components/dashboard/sidebar";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import CreateUserDialog from "@/components/dashboard/create-user-dialog";
import EditUserDialog from "@/components/dashboard/edit-user-dialog";
import { getStaffAction } from "@/app/actions/users";
import { getSystemSettings, updateSystemSettings } from "@/app/actions/settings";
import { toast } from "sonner";

const roleStyles: Record<string, string> = {
    super_admin: "bg-purple-100 text-purple-700 border-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.15)]",
    admin: "bg-blue-100 text-blue-700 border-blue-200 shadow-[0_0_15px_rgba(59,130,246,0.15)]",
    cobrador: "bg-emerald-100 text-emerald-700 border-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.15)]",
    viewer: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function ConfigPage() {
    const [activeTab, setActiveTab] = useState("usuarios");
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [editUser, setEditUser] = useState<any>(null);
    const [newCompany, setNewCompany] = useState("");

    // Settings state
    const [settings, setSettings] = useState({
        payment_alert_days: 5,
        policy_alert_days: 15,
        payment_message_template: '',
        policy_message_template: '',
        companies: [] as string[]
    });
    const [savingSettings, setSavingSettings] = useState(false);

    const fetchUsers = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        else setRefreshing(true);

        try {
            const result = await getStaffAction();
            if (result.success) {
                setUsers(result.data || []);
            } else {
                console.error("Fetch error:", result.error);
                toast.error("Error al cargar la lista de staff");
            }
        } catch (err) {
            console.error("Unexpected error:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const fetchSettings = useCallback(async () => {
        const result = await getSystemSettings();
        if (result.success) {
            setSettings({
                payment_alert_days: result.data.payment_alert_days,
                policy_alert_days: result.data.policy_alert_days,
                payment_message_template: result.data.payment_message_template || '',
                policy_message_template: result.data.policy_message_template || '',
                companies: result.data.companies || ["La Segunda"]
            });
        }
    }, []);

    useEffect(() => {
        fetchUsers();
        fetchSettings();
    }, [fetchUsers, fetchSettings]);

    const handleSaveSettings = async () => {
        setSavingSettings(true);
        try {
            const result = await updateSystemSettings(settings);
            if (result.success) {
                toast.success("Configuración de alertas actualizada");
            } else {
                toast.error("Error al actualizar: " + result.error);
            }
        } finally {
            setSavingSettings(false);
        }
    };

    // Handle dialog close and refresh
    const handleDialogClose = () => {
        setIsCreateDialogOpen(false);
        // Delay slightly to allow DB to settle/Trigger to finish
        setTimeout(() => fetchUsers(true), 500);
    };

    return (
        <div className="flex min-h-screen bg-slate-50/50">
            <Sidebar />
            <main className="flex-1 p-8">
                <header className="mb-10 flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <Settings2 className="w-8 h-8 text-primary" />
                            Gestión Administrativa
                        </h2>
                        <p className="text-muted-foreground font-medium mt-1 uppercase tracking-widest text-[10px] flex items-center gap-2">
                            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                            Nivel Acceso: Super Admin • La Segunda Seguros
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => fetchUsers(true)}
                            className={cn(
                                "p-3 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-primary transition-all",
                                refreshing && "animate-spin text-primary"
                            )}
                            title="Sincronizar Staff"
                        >
                            <RefreshCw className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setIsCreateDialogOpen(true)}
                            className="flex items-center gap-3 px-8 py-4 bg-primary text-white rounded-[22px] font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-xs"
                        >
                            <UserPlus className="w-5 h-5" />
                            Crear Nuevo Usuario
                        </button>
                    </div>
                </header>

                {/* Configuration Tabs */}
                <div className="flex gap-4 mb-8 bg-white/50 p-2 rounded-[24px] border border-slate-100 self-start inline-flex">
                    {["usuarios", "aseguradoras", "alertas"].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                "px-8 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all",
                                activeTab === tab
                                    ? "bg-white text-primary shadow-sm border border-slate-200 ring-4 ring-primary/5"
                                    : "text-slate-400 hover:text-slate-600 hover:bg-white/50"
                            )}
                        >
                            {tab === "usuarios" ? "Staff Autorizado" : tab === "aseguradoras" ? "Compañías" : tab === "alertas" ? "Alertas y Notif." : tab}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Panel Central */}
                    <div className="lg:col-span-3 space-y-6">
                        {activeTab === "usuarios" && (
                            <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
                                {/* ... existing table content ... */}
                                <div className="px-10 py-8 border-b flex items-center justify-between bg-slate-50/20">
                                    <h3 className="font-black text-slate-900 flex items-center gap-3 text-sm uppercase tracking-widest">
                                        <Users className="w-5 h-5 text-primary" />
                                        Directorio de Agentes
                                    </h3>
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input type="text" placeholder="Filtrar por nombre o rol..." className="pl-11 pr-4 py-2.5 bg-slate-100/50 border-0 rounded-2xl text-xs outline-none focus:ring-4 focus:ring-primary/5 min-w-[240px] font-bold" />
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">
                                                <th className="px-10 py-5">Identificación Oficial</th>
                                                <th className="px-6 py-5 border-l">Categoría / Rol</th>
                                                <th className="px-6 py-5 border-l text-center">Estatus</th>
                                                <th className="px-10 py-5 text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 text-sm">
                                            {loading ? (
                                                <tr>
                                                    <td colSpan={4} className="py-20 text-center">
                                                        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
                                                        <p className="text-xs font-bold text-slate-400 italic">Sincronizando staff local...</p>
                                                    </td>
                                                </tr>
                                            ) : users.length > 0 ? users.map((user) => (
                                                <tr key={user.id} className="hover:bg-slate-50/40 transition-colors group">
                                                    <td className="px-10 py-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-14 h-14 rounded-[20px] bg-gradient-to-tr from-slate-200 to-white flex items-center justify-center font-black text-slate-400 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] group-hover:scale-110 transition-all duration-300">
                                                                {user.full_name?.charAt(0) || "U"}
                                                            </div>
                                                            <div>
                                                                <p className="font-extrabold text-slate-800 uppercase text-[13px] tracking-tight">{user.full_name}</p>
                                                                <p className="text-[11px] text-slate-400 font-bold flex items-center gap-1.5 mt-0.5">
                                                                    <Mail className="w-3 h-3 text-primary/30" /> {user.username || "Sin correo"}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-6 border-l">
                                                        <div className={cn(
                                                            "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-dashed",
                                                            roleStyles[user.role] || roleStyles.viewer
                                                        )}>
                                                            <Shield className="w-3 h-3" />
                                                            {user.role?.replace("_", " ")}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-6 border-l text-center">
                                                        <div className={cn(
                                                            "inline-flex items-center gap-2 px-4 py-2 rounded-full border shadow-sm",
                                                            user.is_active !== false
                                                                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                                : "bg-rose-50 text-rose-500 border-rose-100"
                                                        )}>
                                                            <div className={cn(
                                                                "w-2.5 h-2.5 rounded-full",
                                                                user.is_active !== false ? "bg-emerald-500 animate-pulse" : "bg-rose-400"
                                                            )} />
                                                            <span className="text-[10px] font-black uppercase tracking-widest">
                                                                {user.is_active !== false ? "Activo" : "Inactivo"}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-10 py-6 text-right">
                                                        <button
                                                            onClick={() => setEditUser(user)}
                                                            className="px-4 py-2 text-xs font-black uppercase tracking-widest text-primary bg-primary/5 rounded-xl hover:bg-primary/10 transition-all border border-primary/10"
                                                        >
                                                            Editar
                                                        </button>
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan={4} className="py-20 text-center">
                                                        <p className="text-slate-400 font-bold italic">No se encontraron usuarios en la base de datos.</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeTab === "aseguradoras" && (
                            <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="px-10 py-8 border-b bg-slate-50/20">
                                    <h3 className="font-black text-slate-900 flex items-center gap-3 text-sm uppercase tracking-widest">
                                        <Building2 className="w-5 h-5 text-primary" />
                                        Compañías Aseguradoras
                                    </h3>
                                    <p className="text-[11px] text-slate-400 font-bold mt-1 uppercase tracking-tight">Administra la lista de compañías aseguradoras disponibles para cargar pólizas</p>
                                </div>

                                <div className="p-10 space-y-10">
                                    <div className="max-w-2xl mx-auto w-full space-y-6">
                                        <div className="flex gap-3">
                                            <input
                                                type="text"
                                                value={newCompany}
                                                onChange={(e) => setNewCompany(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" && newCompany.trim()) {
                                                        e.preventDefault();
                                                        if (!settings.companies.includes(newCompany.trim())) {
                                                            setSettings({ ...settings, companies: [...settings.companies, newCompany.trim()] });
                                                        }
                                                        setNewCompany("");
                                                    }
                                                }}
                                                placeholder="Nombre de la nueva compañía... (Ej: RUS)"
                                                className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all uppercase text-sm"
                                            />
                                            <button
                                                onClick={() => {
                                                    if (newCompany.trim() && !settings.companies.includes(newCompany.trim())) {
                                                        setSettings({ ...settings, companies: [...settings.companies, newCompany.trim()] });
                                                        setNewCompany("");
                                                    }
                                                }}
                                                className="px-6 py-3 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-md hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
                                            >
                                                <Plus className="w-4 h-4" /> Agregar
                                            </button>
                                        </div>

                                        <div className="bg-slate-50 border border-slate-100 rounded-[24px] p-6 flex flex-wrap gap-3">
                                            {settings.companies.map((company) => (
                                                <div key={company} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm group">
                                                    <span className="font-black text-slate-700 text-xs uppercase tracking-wider">{company}</span>
                                                    <button
                                                        onClick={() => setSettings({ ...settings, companies: settings.companies.filter(c => c !== company) })}
                                                        className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                            {settings.companies.length === 0 && (
                                                <p className="text-slate-400 font-bold italic text-xs p-4 text-center w-full">No hay compañías definidas. Agrega una arriba.</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-slate-100 flex justify-end">
                                        <button
                                            onClick={handleSaveSettings}
                                            disabled={savingSettings}
                                            className="flex items-center gap-3 px-10 py-4 bg-primary text-white rounded-[22px] font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-xs disabled:opacity-50 disabled:scale-100"
                                        >
                                            {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                            Guardar Configuración
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "alertas" && (
                            <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="px-10 py-8 border-b bg-slate-50/20">
                                    <h3 className="font-black text-slate-900 flex items-center gap-3 text-sm uppercase tracking-widest">
                                        <Bell className="w-5 h-5 text-primary" />
                                        Configuración de Alertas Tempranas
                                    </h3>
                                    <p className="text-[11px] text-slate-400 font-bold mt-1 uppercase tracking-tight">Define con cuántos días de anticipación se mostrarán los avisos de vencimiento</p>
                                </div>

                                <div className="p-10 space-y-10">
                                    <div className="grid grid-cols-1 gap-8">
                                        {/* Alerta de Cobranza */}
                                        <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-100 group hover:border-primary/20 transition-all max-w-2xl mx-auto w-full">
                                            <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                                <CreditCard className="w-6 h-6 text-primary" />
                                            </div>
                                            <h4 className="font-black text-slate-800 text-xs uppercase tracking-widest mb-2">Vencimiento de Cuota</h4>
                                            <p className="text-[11px] text-slate-400 font-medium mb-6">Días antes del vencimiento para marcar como "Por Vencer" en la matriz.</p>

                                            <div className="flex items-center gap-4 mb-6">
                                                <input
                                                    type="number"
                                                    value={settings.payment_alert_days}
                                                    onChange={(e) => setSettings({ ...settings, payment_alert_days: parseInt(e.target.value) || 0 })}
                                                    className="w-24 px-4 py-3 bg-white border border-slate-200 rounded-xl font-black text-center outline-none focus:ring-4 focus:ring-primary/10"
                                                />
                                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Días</span>
                                            </div>

                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                <MessageSquare className="w-3 h-3" /> Plantilla WhatsApp
                                            </p>
                                            <textarea
                                                value={settings.payment_message_template}
                                                onChange={(e) => setSettings({ ...settings, payment_message_template: e.target.value })}
                                                className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-xs font-medium outline-none focus:ring-4 focus:ring-primary/10 min-h-[100px] resize-none"
                                                placeholder="Ej: Hola {nombre}! Vence tu cuota el día {fecha}."
                                            />
                                            <p className="text-[9px] text-slate-400 mt-2 font-bold italic">Variables: {'{nombre}, {fecha}'}</p>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-slate-100 flex justify-end">
                                        <button
                                            onClick={handleSaveSettings}
                                            disabled={savingSettings}
                                            className="flex items-center gap-3 px-10 py-4 bg-primary text-white rounded-[22px] font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-xs disabled:opacity-50 disabled:scale-100"
                                        >
                                            {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                            Guardar Configuración
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Quick Actions Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
                            <h3 className="font-black text-slate-900 mb-8 flex items-center gap-3 text-sm uppercase tracking-widest">
                                <ShieldAlert className="w-6 h-6 text-primary" />
                                Auditoría
                            </h3>
                            <div className="space-y-4">
                                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Staff</span>
                                        <span className="text-xl font-black text-slate-900">{users.length}</span>
                                    </div>
                                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                        <div className="bg-primary h-full rounded-full" style={{ width: '100%' }} />
                                    </div>
                                </div>

                                <button className="w-full flex items-center justify-between p-5 bg-white hover:bg-slate-50 rounded-2xl transition-all group border border-slate-100 shadow-sm">
                                    <div className="flex items-center gap-3 text-left">
                                        <Key className="w-5 h-5 text-slate-400 group-hover:text-primary" />
                                        <div>
                                            <p className="text-xs font-black text-slate-700">Logs de Acceso</p>
                                            <p className="text-[10px] text-slate-400 font-extrabold uppercase mt-0.5">Historial</p>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-primary to-blue-600 p-8 rounded-[40px] shadow-2xl shadow-primary/30 text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl" />
                            <ShieldIcon className="w-10 h-10 mb-4 opacity-50" />
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-3 opacity-60">Seguridad Pro</p>
                            <p className="text-[13px] font-bold leading-relaxed">
                                El sistema de roles asegura que los cobradores solo vean sus certificados asignados.
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            <CreateUserDialog
                isOpen={isCreateDialogOpen}
                onClose={handleDialogClose}
            />

            {editUser && (
                <EditUserDialog
                    isOpen={!!editUser}
                    onClose={() => { setEditUser(null); fetchUsers(true); }}
                    user={editUser}
                />
            )}
        </div>
    );
}

function ShieldCheckIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
    );
}

function ShieldIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
    );
}
