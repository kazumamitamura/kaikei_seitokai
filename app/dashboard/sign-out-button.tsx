"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function SignOutButton() {
    const router = useRouter();

    const handleSignOut = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/login");
    };

    return (
        <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2 rounded-lg
        bg-white/5 border border-white/10 text-slate-400 text-sm
        hover:bg-white/10 hover:text-white
        transition-all duration-200"
        >
            <LogOut className="w-4 h-4" />
            ログアウト
        </button>
    );
}
