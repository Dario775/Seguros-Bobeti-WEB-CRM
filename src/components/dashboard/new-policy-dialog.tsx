"use client";

import { useState, useEffect, useRef } from "react";
import { X, ShieldPlus, Loader2, Search, UserPlus, Car, Calendar, DollarSign, FileText, Layers, Check, Building2 } from "lucide-react";
import { toast } from "sonner";
import { createPolicyAction } from "@/app/actions/policies";
import { createClientAction } from "@/app/actions/clients";
import { supabase } from "@/lib/supabase";

interface NewPolicyDialogProps {
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

export default function NewPolicyDialog({ isOpen, onClose }: NewPolicyDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [clients, setClients] = useState<any[]>([]);
    const [clientSearch, setClientSearch] = useState("");
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [showNewClientForm, setShowNewClientForm] = useState(false);
    const [newClient, setNewClient] = useState({ full_name: "", dni: "", phone: "+54" });
    const [creatingClient, setCreatingClient] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [formData, setFormData] = useState({
        type: "auto",
        company: "",
        dominio: "",
        start_date: new Date().toISOString().split("T")[0],
        monthly_amount: "",
        installments: 12,
        notes: "",
    });

    const [userProfile, setUserProfile] = useState<any>(null);
    const [companies, setCompanies] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen) {
            supabase.from("clients").select("id, full_name, dni, phone")
                .eq("is_active", true).order("full_name")
                .then(({ data }) => setClients(data || []));

            supabase.auth.getUser().then(({ data: { user } }) => {
                if (user) {
                    supabase.from("profiles").select("*").eq("id", user.id).single()
                        .then(({ data }) => setUserProfile(data || { role: 'viewer', permissions: {} }));
                }
            });

            supabase.from("system_settings").select("companies").eq("id", "global").single()
                .then(({ data }) => {
                    const loaded = data?.companies || ["La Segunda", "RUS", "San Cristobal", "Sancor"];
                    setCompanies(loaded);
                    setFormData(prev => ({ ...prev, company: loaded[0] || "" }));
                });

            // Reset
            setSelectedClient(null);
            setClientSearch("");
            setShowNewClientForm(false);
            setNewClient({ full_name: "", dni: "", phone: "+54" });
            setFormData({
                type: "auto", company: companies[0] || "La Segunda", dominio: "",
                start_date: new Date().toISOString().split("T")[0],
                monthly_amount: "", installments: 12, notes: "",
            });
        }
    }, [isOpen]);

    const formatDNI = (val: string) => {
        const num = val.replace(/\D/g, "");
        return num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    if (!isOpen) return null;

    const filteredClients = clients.filter(c => {
        const term = clientSearch.toLowerCase();
        return c.full_name.toLowerCase().includes(term) || (c.dni || "").includes(clientSearch);
    });

    const handleSelectClient = (client: any) => {
        setSelectedClient(client);
        setClientSearch(client.full_name);
        setShowDropdown(false);
        setShowNewClientForm(false);
    };

    const handleCreateClient = async () => {
        if (!newClient.full_name || !newClient.dni) {
            toast.error("Nombre y DNI son obligatorios");
            return;
        }
        setCreatingClient(true);
        try {
            const result = await createClientAction({
                full_name: newClient.full_name.toUpperCase(),
                dni: newClient.dni,
                phone: newClient.phone,
            });
            if (result.success) {
                toast.success(`${newClient.full_name.toUpperCase()} creado`);
                const created = result.data;
                setClients([...clients, created]);
                setSelectedClient(created);
                setClientSearch(created.full_name);
                setShowNewClientForm(false);
            } else {
                toast.error(result.error || "Error al crear cliente");
            }
        } catch {
            toast.error("Error inesperado");
        } finally {
            setCreatingClient(false);
        }
    };



    const endDatePreview = (() => {
        if (!formData.start_date || !formData.installments) return "";
        const d = new Date(formData.start_date);
        d.setMonth(d.getMonth() + formData.installments);
        return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
    })();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClient) { toast.error("Seleccioná o creá un asegurado"); return; }

        setIsSubmitting(true);
        try {
            // Auto-generate policy number
            const timestamp = Date.now().toString(36).toUpperCase();
            const policy_number = `POL-${timestamp}`;

            const result = await createPolicyAction({
                client_id: selectedClient.id,
                policy_number,
                ...formData,
                monthly_amount: 0,
            });

            if (result.success) {
                toast.success(`Póliza creada — ${formData.installments} cuotas generadas`);
                onClose();
            } else {
                toast.error(result.error || "Error al crear la póliza");
            }
        } catch {
            toast.error("Error inesperado");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b bg-slate-50/50 flex items-center justify-between sticky top-0 bg-white z-10">
                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-50 p-2.5 rounded-xl text-emerald-600">
                            <ShieldPlus className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 leading-tight">Nueva Póliza</h2>
                            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Registrar seguro y generar cuotas mensuales</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {/* Client Search */}
                    <div className="space-y-2" ref={dropdownRef}>
                        <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                            <Search className="w-3.5 h-3.5" /> Buscar Asegurado
                        </label>

                        {selectedClient ? (
                            <div className="flex items-center justify-between px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <Check className="w-5 h-5 text-emerald-600" />
                                    <div>
                                        <p className="font-black text-slate-900 text-sm">{selectedClient.full_name}</p>
                                        <p className="text-[10px] font-bold text-slate-500">DNI {selectedClient.dni} {selectedClient.phone && `• ${selectedClient.phone}`}</p>
                                    </div>
                                </div>
                                <button type="button" onClick={() => { setSelectedClient(null); setClientSearch(""); }}
                                    className="text-xs font-black text-emerald-700 hover:text-emerald-900 uppercase tracking-wider">
                                    Cambiar
                                </button>
                            </div>
                        ) : (
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre o DNI..."
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold text-slate-900 shadow-inner"
                                    value={clientSearch}
                                    onChange={(e) => { setClientSearch(e.target.value); setShowDropdown(true); }}
                                    onFocus={() => setShowDropdown(true)}
                                />

                                {showDropdown && clientSearch.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 max-h-56 overflow-y-auto">
                                        {filteredClients.length > 0 ? filteredClients.map(c => (
                                            <button key={c.id} type="button" onClick={() => handleSelectClient(c)}
                                                className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-0">
                                                <div>
                                                    <p className="font-black text-slate-900 text-sm">{c.full_name}</p>
                                                    <p className="text-[10px] font-bold text-slate-400">DNI {c.dni}</p>
                                                </div>
                                                {c.phone && <span className="text-[10px] text-slate-400 font-bold">{c.phone}</span>}
                                            </button>
                                        )) : (
                                            <div className="p-5 text-center">
                                                <p className="text-sm text-slate-400 italic mb-3">No se encontró "{clientSearch}"</p>
                                                {(userProfile?.role === "super_admin" || userProfile?.permissions?.clientes_crear) && (
                                                    <button type="button"
                                                        onClick={() => {
                                                            setShowNewClientForm(true);
                                                            setShowDropdown(false);
                                                            setNewClient({ ...newClient, full_name: clientSearch.toUpperCase() });
                                                        }}
                                                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-wider hover:scale-105 active:scale-95 transition-all">
                                                        <UserPlus className="w-4 h-4" /> Crear Nuevo Cliente
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Inline new client form */}
                        {showNewClientForm && !selectedClient && (
                            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 space-y-4 mt-3 animate-in slide-in-from-top-2 duration-200">
                                <p className="text-xs font-black text-blue-700 uppercase tracking-wider flex items-center gap-2">
                                    <UserPlus className="w-4 h-4" /> Crear nuevo asegurado
                                </p>
                                <div className="grid grid-cols-3 gap-3">
                                    <input required type="text" placeholder="Nombre y Apellido"
                                        className="col-span-1 px-3 py-2.5 bg-white border border-blue-200 rounded-xl text-sm font-bold text-slate-900 uppercase outline-none focus:ring-2 focus:ring-primary/20"
                                        value={newClient.full_name}
                                        onChange={e => setNewClient({ ...newClient, full_name: e.target.value })} />
                                    <input required type="text" placeholder="DNI"
                                        className="px-3 py-2.5 bg-white border border-blue-200 rounded-xl text-sm font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary/20"
                                        value={newClient.dni}
                                        onChange={e => setNewClient({ ...newClient, dni: formatDNI(e.target.value) })} />
                                    <input type="tel" placeholder="Teléfono (opcional)"
                                        className="px-3 py-2.5 bg-white border border-blue-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary/20"
                                        value={newClient.phone}
                                        onChange={e => setNewClient({ ...newClient, phone: e.target.value })} />
                                </div>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setShowNewClientForm(false)}
                                        className="px-4 py-2 border border-blue-200 rounded-xl text-xs font-black text-blue-600 uppercase tracking-wider hover:bg-white">
                                        Cancelar
                                    </button>
                                    <button type="button" disabled={creatingClient} onClick={handleCreateClient}
                                        className="px-5 py-2 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50">
                                        {creatingClient ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                        Crear y Seleccionar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                                <ShieldPlus className="w-3.5 h-3.5" /> Tipo de Seguro
                            </label>
                            <select
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold text-slate-900 appearance-none shadow-inner"
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
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
                                value={formData.company}
                                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
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
                                value={formData.dominio}
                                onChange={(e) => setFormData({ ...formData, dominio: e.target.value.toUpperCase() })}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5" /> Inicio de Vigencia
                            </label>
                            <input
                                required type="date"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold text-slate-900 shadow-inner"
                                value={formData.start_date}
                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                                <Layers className="w-3.5 h-3.5" /> Cantidad de Cuotas
                            </label>
                            <input
                                required type="number" min="1" max="48"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold text-slate-900 shadow-inner"
                                value={formData.installments}
                                onChange={(e) => setFormData({ ...formData, installments: parseInt(e.target.value) || 1 })}
                            />
                        </div>
                    </div>

                    {/* Preview card */}
                    {formData.installments > 0 && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider mb-1">Fin de Vigencia Estimado</p>
                            <p className="text-xl font-black text-emerald-800">{endDatePreview}</p>
                        </div>
                    )}

                    {/* Notes */}
                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5" /> Observaciones
                        </label>
                        <textarea
                            rows={2} placeholder="Notas adicionales..."
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold text-slate-900 shadow-inner resize-none"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>

                    <div className="pt-6 border-t flex gap-4">
                        <button type="button" disabled={isSubmitting} onClick={onClose}
                            className="flex-1 px-6 py-4 border border-slate-200 rounded-2xl font-black text-slate-600 hover:bg-slate-50 transition-all uppercase tracking-widest text-xs disabled:opacity-50">
                            Cancelar
                        </button>
                        <button type="submit" disabled={isSubmitting || !selectedClient}
                            className="flex-1 px-6 py-4 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2 disabled:opacity-50">
                            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creando...</> : `Crear Póliza (${formData.installments} cuotas)`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
