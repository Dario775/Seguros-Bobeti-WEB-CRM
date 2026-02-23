import Sidebar from "@/components/dashboard/sidebar";
import CollectionGrid from "@/components/dashboard/collection-grid";
import { TableProperties } from "lucide-react";

export default function CobranzasPage() {
    return (
        <div className="flex flex-col lg:flex-row min-h-screen bg-background">
            <Sidebar />
            <main className="flex-1 p-4 md:p-8 pb-24 lg:pb-8 overflow-hidden flex flex-col h-screen">
                <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between shrink-0 gap-4">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-3">
                            <TableProperties className="w-6 h-6 md:w-8 md:h-8 text-primary" />
                            Matriz de Cobranzas {new Date().getFullYear()}
                        </h2>
                        <p className="text-muted-foreground mt-1 text-sm font-medium italic">Sistema de Gestión Pro - La Segunda Seguros</p>
                    </div>
                    <div className="flex bg-white border rounded-xl p-1 shadow-sm font-bold text-[10px] md:text-xs">
                        <button className="px-3 md:px-4 py-2 bg-primary text-white rounded-lg">CALENDARIO 2025</button>
                        <button className="px-3 md:px-4 py-2 text-muted-foreground hover:bg-slate-50 rounded-lg transition-colors">HISTORIAL</button>
                    </div>
                </header>

                <div className="flex-1 min-h-0">
                    <CollectionGrid />
                </div>
            </main>
        </div>
    );
}
