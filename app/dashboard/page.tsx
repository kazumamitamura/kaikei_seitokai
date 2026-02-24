import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
    Wallet,
    ArrowDownCircle,
    CircleDollarSign,
    AlertTriangle,
    ServerCrash,
    FilePlus2,
    Clock,
    Shield,
} from "lucide-react";
import Link from "next/link";
import SignOutButton from "./sign-out-button";
import HistoryFilter from "./history-filter";

export default async function DashboardPage() {
    const supabase = await createClient();

    // ── 1. 認証チェック（標準クライアント = Cookie） ──
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    // ── 2. ks_users（Admin + maybeSingle で安全に取得） ──
    const admin = createAdminClient();

    const { data: ksUser, error: userError } = await admin
        .from("ks_users")
        .select("club_id, display_name, role")
        .eq("auth_uid", user.id)
        .is("deleted_at", null)
        .limit(1)
        .maybeSingle();

    if (userError) {
        console.error("❌ Dashboard: ks_users クエリエラー:", userError.message);
    }

    // 【超重要】データ未取得でも redirect('/setup') しない → ループ防止
    if (!ksUser) {
        console.error("❌ Dashboard: ks_users データなし, auth_uid:", user.id);
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-4">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-10 text-center max-w-md">
                    <ServerCrash className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">
                        データを取得できませんでした
                    </h2>
                    <p className="text-slate-400 text-sm mb-4">
                        ユーザー情報がまだ登録されていないか、データの読み込みに失敗しました。
                    </p>
                    <p className="text-slate-500 text-xs mb-6 font-mono break-all">
                        auth_uid: {user.id}
                    </p>
                    <div className="flex gap-3 justify-center">
                        <a
                            href="/setup"
                            className="px-4 py-2 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-sm hover:bg-indigo-500/30 transition-all"
                        >
                            初期設定へ
                        </a>
                        <SignOutButton />
                    </div>
                </div>
            </div>
        );
    }

    // ── 3. ks_clubs（maybeSingle で安全に） ──
    const { data: club } = await admin
        .from("ks_clubs")
        .select("name, total_budget")
        .eq("id", ksUser.club_id)
        .limit(1)
        .maybeSingle();

    const clubName = club?.name ?? "不明";
    const totalBudget = Number(club?.total_budget ?? 0);

    // ── 4. ks_requests 承認済み支出合計 ──
    const { data: approvedRequests } = await admin
        .from("ks_requests")
        .select("total_amount")
        .eq("club_id", ksUser.club_id)
        .in("status", ["approved", "paid"])
        .is("deleted_at", null);

    const totalSpent = (approvedRequests ?? []).reduce(
        (sum, r) => sum + Number(r.total_amount),
        0
    );

    const remaining = totalBudget - totalSpent;
    const isNegative = remaining < 0;

    // ── 5. 申請履歴を取得 ──
    const { data: requestHistory } = await admin
        .from("ks_requests")
        .select("id, date, category, reason, applicant_name, total_amount, status, receipt_url, revision_number, created_at")
        .eq("club_id", ksUser.club_id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(200);

    // 領収書の署名付きURLを生成
    const historyWithUrls = await Promise.all(
        (requestHistory ?? []).map(async (req) => {
            let signedReceiptUrl: string | null = null;
            if (req.receipt_url) {
                const { data: signedData } = await admin.storage
                    .from("ks_receipts")
                    .createSignedUrl(req.receipt_url, 3600);
                signedReceiptUrl = signedData?.signedUrl ?? null;
            }
            return { ...req, signedReceiptUrl };
        })
    );

    const fmt = (n: number) =>
        new Intl.NumberFormat("ja-JP", {
            style: "currency",
            currency: "JPY",
            maximumFractionDigits: 0,
        }).format(n);

    const usagePercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
            <div className="fixed inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-60 pointer-events-none" />

            <div className="relative max-w-4xl mx-auto px-4 py-8">
                <header className="flex items-center justify-between mb-10">
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                            <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white shadow-lg shadow-indigo-500/25">
                                会
                            </span>
                            {clubName}
                        </h1>
                        <p className="text-sm text-slate-400 mt-1">
                            {ksUser.display_name || user.email} ・{" "}
                            {ksUser.role === "admin"
                                ? "管理者"
                                : ksUser.role === "advisor"
                                    ? "顧問"
                                    : ksUser.role === "approver"
                                        ? "承認者"
                                        : ksUser.role === "global_admin"
                                            ? "全体管理者"
                                            : "部員"}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            href="/admin"
                            className="flex items-center gap-2 px-4 py-2 rounded-lg
                                bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-medium
                                hover:from-amber-600 hover:to-orange-700 active:scale-[0.98]
                                transition-all shadow-lg shadow-amber-500/25"
                        >
                            <Shield className="w-4 h-4" />
                            管理画面
                        </Link>
                        <Link
                            href="/requests/new"
                            className="flex items-center gap-2 px-4 py-2 rounded-lg
                                bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium
                                hover:from-indigo-600 hover:to-purple-700 active:scale-[0.98]
                                transition-all shadow-lg shadow-indigo-500/25"
                        >
                            <FilePlus2 className="w-4 h-4" />
                            新規申請
                        </Link>
                        <SignOutButton />
                    </div>
                </header>

                {/* 残額カード */}
                <div className="relative mb-8">
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-xl" />
                    <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-10 text-center">
                        <p className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
                            現在の残額
                        </p>
                        <p
                            className={`text-5xl md:text-6xl font-extrabold tracking-tight transition-colors ${isNegative
                                ? "text-red-500 drop-shadow-[0_0_32px_rgba(239,68,68,0.3)]"
                                : "text-white drop-shadow-[0_0_32px_rgba(255,255,255,0.1)]"
                                }`}
                        >
                            {fmt(remaining)}
                        </p>
                        {isNegative && (
                            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20">
                                <AlertTriangle className="w-4 h-4 text-red-400" />
                                <span className="text-red-300 text-sm font-semibold">
                                    予算超過 — 管理者に連絡してください
                                </span>
                            </div>
                        )}
                        <div className="mt-8 max-w-md mx-auto">
                            <div className="flex justify-between text-xs text-slate-500 mb-2">
                                <span>使用率</span>
                                <span>{Math.min(usagePercent, 100).toFixed(1)}%</span>
                            </div>
                            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-700 ease-out ${usagePercent > 100
                                        ? "bg-red-500"
                                        : usagePercent > 80
                                            ? "bg-amber-500"
                                            : "bg-gradient-to-r from-indigo-500 to-purple-500"
                                        }`}
                                    style={{ width: `${Math.min(usagePercent, 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* サマリーカード */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-lg bg-indigo-500/10">
                                <Wallet className="w-5 h-5 text-indigo-400" />
                            </div>
                            <span className="text-sm text-slate-400">初期予算</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{fmt(totalBudget)}</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-lg bg-pink-500/10">
                                <ArrowDownCircle className="w-5 h-5 text-pink-400" />
                            </div>
                            <span className="text-sm text-slate-400">承認済み支出</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{fmt(totalSpent)}</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-lg bg-emerald-500/10">
                                <CircleDollarSign className="w-5 h-5 text-emerald-400" />
                            </div>
                            <span className="text-sm text-slate-400">残額</span>
                        </div>
                        <p className={`text-2xl font-bold ${isNegative ? "text-red-500" : "text-white"}`}>
                            {fmt(remaining)}
                        </p>
                    </div>
                </div>

                {/* ═══ 申請履歴（フィルター付き） ═══ */}
                <section>
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-indigo-400" />
                        申請履歴
                    </h2>

                    <HistoryFilter items={historyWithUrls} />
                </section>
            </div>
        </div>
    );
}
