import Sidebar from "@/components/dashboard/sidebar";
import CollectionGrid from "@/components/dashboard/collection-grid";
import { TableProperties } from "lucide-react";

export default function CobranzasPage() {
    return (
        <div className="flex min-h-screen bg-background">
            <Sidebar />
            <main className="flex-1 p-8 overflow-hidden flex flex-col h-screen">
                <header className="mb-8 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                            <TableProperties className="w-8 h-8 text-primary" />
                            Matriz de Cobranzas {new Date().getFullYear()}
                        </h2>
                        <p className="text-muted-foreground mt-1 text-sm font-medium italic">Sistema de Gestión Pro - La Segunda Seguros</p>
                    </div>
                    <div className="flex bg-white border rounded-xl p-1 shadow-sm font-bold text-xs">
                        <button className="px-4 py-2 bg-primary text-white rounded-lg">CALENDARIO 2025</button>
                        <button className="px-4 py-2 text-muted-foreground hover:bg-slate-50 rounded-lg transition-colors">HISTORIAL</button>
                    </div>
                </header>

                <div className="flex-1 min-h-0">
                    <CollectionGrid />
                </div>
            </main>
        </div>
    );
}
