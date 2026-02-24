"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
    return (
        <button
            onClick={() => window.print()}
            className="print:hidden flex items-center gap-2 px-5 py-2.5 rounded-xl
                bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold text-sm
                hover:from-amber-600 hover:to-orange-700 active:scale-[0.98]
                transition-all duration-200 shadow-lg shadow-amber-500/25"
        >
            <Printer className="w-4 h-4" />
            印刷して提出
        </button>
    );
}
