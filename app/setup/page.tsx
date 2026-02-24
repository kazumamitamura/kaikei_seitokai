import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import SetupForm from "./setup-form";

export default async function SetupPage() {
    const supabase = await createClient();
    const admin = createAdminClient();

    // ── 認証チェック（標準クライアント = Cookie） ──
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    // ── 既に ks_users に登録済みならダッシュボードへ（Admin = RLS バイパス） ──
    const { data: ksUser } = await admin
        .from("ks_users")
        .select("id")
        .eq("auth_uid", user.id)
        .is("deleted_at", null)
        .maybeSingle();

    if (ksUser) redirect("/dashboard");

    // ── 登録済み部活動一覧（プルダウン用） ──
    const { data: clubs } = await admin
        .from("ks_clubs")
        .select("id, name")
        .is("deleted_at", null)
        .order("name");

    const displayName =
        user.user_metadata?.full_name || user.email || "ユーザー";

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-4">
            {/* Subtle grid overlay */}
            <div className="fixed inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-60 pointer-events-none" />

            <div className="relative w-full max-w-lg">
                {/* Glow */}
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-xl" />

                <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-10 shadow-2xl">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-5 shadow-lg shadow-indigo-500/25">
                            <span className="text-2xl font-bold text-white">会</span>
                        </div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">
                            初期設定
                        </h1>
                        <p className="text-sm text-slate-400 mt-2">
                            ようこそ、{displayName} さん！
                            <br />
                            部活動を選択するか、新規登録して予算管理を始めましょう。
                        </p>
                    </div>

                    <SetupForm clubs={clubs ?? []} />
                </div>
            </div>
        </div>
    );
}
