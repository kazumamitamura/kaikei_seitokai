import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import RequestForm from "./request-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NewRequestPage() {
    const supabase = await createClient();

    // ── 認証チェック ──
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    // ── ユーザー情報取得 ──
    const admin = createAdminClient();
    const { data: ksUser } = await admin
        .from("ks_users")
        .select("club_id, display_name, role")
        .eq("auth_uid", user.id)
        .is("deleted_at", null)
        .limit(1)
        .maybeSingle();

    if (!ksUser) redirect("/setup");

    const { data: club } = await admin
        .from("ks_clubs")
        .select("name")
        .eq("id", ksUser.club_id)
        .limit(1)
        .maybeSingle();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
            <div className="fixed inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-60 pointer-events-none" />

            <div className="relative max-w-5xl mx-auto px-4 py-8">
                {/* ヘッダー */}
                <header className="mb-8">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-4"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        ダッシュボードに戻る
                    </Link>
                    <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white shadow-lg shadow-indigo-500/25">
                            申
                        </span>
                        新規購入申請
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">
                        {club?.name ?? "不明"} ・ {ksUser.display_name}
                    </p>
                </header>

                <RequestForm
                    defaultApplicant={ksUser.display_name}
                    defaultJobTitle={
                        ksUser.role === "admin"
                            ? "事務担当"
                            : ksUser.role === "advisor"
                                ? "顧問"
                                : "部員"
                    }
                />
            </div>
        </div>
    );
}
