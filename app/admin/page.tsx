import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
    Shield,
    Wallet,
    Clock,
    ArrowLeft,
    Search,
} from "lucide-react";
import Link from "next/link";
import AdminActions from "./admin-actions";
import AdminSearch from "./admin-search";

export default async function AdminPage() {
    const supabase = await createClient();

    // ── 1. 認証チェック ──
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    // ── 2. ユーザー情報取得（全ユーザーアクセス可 — UI構築優先） ──
    const admin = createAdminClient();
    const { data: ksUser } = await admin
        .from("ks_users")
        .select("id, display_name, role")
        .eq("auth_uid", user.id)
        .is("deleted_at", null)
        .limit(1)
        .maybeSingle();

    if (!ksUser) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-4">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-10 text-center max-w-md">
                    <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">
                        ユーザー情報が見つかりません
                    </h2>
                    <p className="text-slate-400 text-sm mb-6">
                        初期設定が完了していない可能性があります。
                    </p>
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-sm hover:bg-indigo-500/30 transition-all"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        ダッシュボードへ戻る
                    </Link>
                </div>
            </div>
        );
    }

    // ── 3. 全クラブの予算情報を取得 ──
    const { data: clubs } = await admin
        .from("ks_clubs")
        .select("id, name, total_budget")
        .is("deleted_at", null)
        .order("name");

    // 各クラブの承認済み支出を計算
    const { data: allApproved } = await admin
        .from("ks_requests")
        .select("club_id, total_amount")
        .in("status", ["approved", "paid"])
        .is("deleted_at", null);

    const spentByClub: Record<string, number> = {};
    (allApproved ?? []).forEach((r) => {
        spentByClub[r.club_id] = (spentByClub[r.club_id] || 0) + Number(r.total_amount);
    });

    // ── 4. 決裁待ちの申請を取得 ──
    const { data: pendingRequests } = await admin
        .from("ks_requests")
        .select("id, date, applicant_name, category, reason, total_amount, club_id, receipt_url, approval_flow, rejection_reason, status")
        .eq("status", "submitted")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

    // club_id → club name マッピング
    const clubMap: Record<string, string> = {};
    (clubs ?? []).forEach((c) => {
        clubMap[c.id] = c.name;
    });

    const pendingWithClub = (pendingRequests ?? []).map((r) => ({
        ...r,
        club_name: clubMap[r.club_id] || "不明",
        approval_flow: Array.isArray(r.approval_flow) ? r.approval_flow : [],
    }));

    // ── 5. 全申請を取得（横断検索用） ──
    const { data: allRequests } = await admin
        .from("ks_requests")
        .select("id, date, applicant_name, category, reason, total_amount, club_id, receipt_url, approval_flow, rejection_reason, status, revision_number")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(500);

    const allWithClub = (allRequests ?? []).map((r) => ({
        ...r,
        club_name: clubMap[r.club_id] || "不明",
        approval_flow: Array.isArray(r.approval_flow) ? r.approval_flow : [],
    }));

    const fmt = (n: number) =>
        new Intl.NumberFormat("ja-JP", {
            style: "currency",
            currency: "JPY",
            maximumFractionDigits: 0,
        }).format(n);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
            <div className="fixed inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-60 pointer-events-none print:hidden" />

            <div className="relative max-w-6xl mx-auto px-4 py-8">
                {/* ヘッダー */}
                <header className="mb-10 print:hidden">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-4"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        ダッシュボードに戻る
                    </Link>
                    <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-sm font-bold text-white shadow-lg shadow-amber-500/25">
                            管
                        </span>
                        全体管理ダッシュボード
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">
                        {ksUser.display_name} ・ {ksUser.role === "global_admin" ? "全体管理者" : "管理者"}
                    </p>
                </header>

                {/* ═══ 部活動別予算一覧 ═══ */}
                <section className="mb-10">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-indigo-400" />
                        部活動別予算概要
                    </h2>

                    {(!clubs || clubs.length === 0) ? (
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-8 text-center">
                            <p className="text-slate-400 text-sm">登録されている部活動はありません</p>
                        </div>
                    ) : (
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-white/10">
                                            <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">
                                                部活動名
                                            </th>
                                            <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">
                                                初期予算
                                            </th>
                                            <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">
                                                承認済み支出
                                            </th>
                                            <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">
                                                残額
                                            </th>
                                            <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">
                                                使用率
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {clubs.map((club) => {
                                            const budget = Number(club.total_budget);
                                            const spent = spentByClub[club.id] || 0;
                                            const remaining = budget - spent;
                                            const pct = budget > 0 ? (spent / budget) * 100 : 0;

                                            return (
                                                <tr
                                                    key={club.id}
                                                    className="hover:bg-white/[0.02] transition-colors"
                                                >
                                                    <td className="px-6 py-4">
                                                        <span className="text-sm font-medium text-white">
                                                            {club.name}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className="text-sm text-slate-300 tabular-nums">
                                                            {fmt(budget)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className="text-sm text-pink-300 tabular-nums">
                                                            {fmt(spent)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span
                                                            className={`text-sm font-semibold tabular-nums ${remaining < 0 ? "text-red-400" : "text-emerald-300"
                                                                }`}
                                                        >
                                                            {fmt(remaining)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-3">
                                                            <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full ${pct > 100
                                                                        ? "bg-red-500"
                                                                        : pct > 80
                                                                            ? "bg-amber-500"
                                                                            : "bg-indigo-500"
                                                                        }`}
                                                                    style={{ width: `${Math.min(pct, 100)}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-xs text-slate-400 tabular-nums w-12 text-right">
                                                                {pct.toFixed(0)}%
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </section>

                {/* ═══ 承認待ち申請一覧 ═══ */}
                <section>
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-amber-400" />
                        決裁待ちリスト
                        {pendingWithClub.length > 0 && (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold">
                                {pendingWithClub.length}
                            </span>
                        )}
                    </h2>

                    <AdminActions requests={pendingWithClub} />
                </section>

                {/* ═══ 全申請横断検索 ═══ */}
                <section className="mt-10">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Search className="w-5 h-5 text-indigo-400" />
                        全申請横断検索
                    </h2>

                    <AdminSearch
                        requests={allWithClub}
                        clubs={(clubs ?? []).map((c) => ({ id: c.id, name: c.name }))}
                    />
                </section>
            </div>
        </div>
    );
}
