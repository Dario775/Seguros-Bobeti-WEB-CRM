"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import NewClientDialog from "./new-client-dialog";

export default function NewClientDialogWrapper() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all active:scale-95 uppercase tracking-widest text-xs"
            >
                <UserPlus className="w-5 h-5" />
                Nuevo Asegurado
            </button>

            <NewClientDialog
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
            />
        </>
    );
}
