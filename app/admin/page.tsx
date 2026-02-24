import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
    Shield,
    Clock,
    ArrowLeft,
    Search,
} from "lucide-react";
import Link from "next/link";
import AdminActions from "./admin-actions";
import AdminSearch from "./admin-search";
import AdminClubCards from "./admin-club-cards";

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
        const cid = r?.club_id ?? "";
        if (cid) {
            spentByClub[cid] = (spentByClub[cid] ?? 0) + Number(r?.total_amount ?? 0);
        }
    });

    // 部活動は club_id で一意にし、1部活1カードのみ表示
    const clubListRaw = (clubs ?? []).map((c) => ({
        id: c?.id ?? "",
        name: c?.name ?? "",
        total_budget: Number(c?.total_budget ?? 0),
        spent: spentByClub[c?.id ?? ""] ?? 0,
    })).filter((c) => c.id !== "");
    const clubList = Array.from(new Map(clubListRaw.map((c) => [c.id, c])).values()).sort((a, b) =>
        (a.name ?? "").localeCompare(b.name ?? "")
    );

    // ── 4. 決裁待ちの申請を取得 ──
    const { data: pendingRequests } = await admin
        .from("ks_requests")
        .select("id, date, applicant_name, category, reason, total_amount, club_id, receipt_url, approval_flow, rejection_reason, status")
        .eq("status", "submitted")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

    const clubMap: Record<string, string> = {};
    clubList.forEach((c) => {
        clubMap[c.id] = c.name ?? "不明";
    });

    const pendingWithClub = (pendingRequests ?? []).map((r) => ({
        ...r,
        club_name: clubMap[r.club_id] || "不明",
        approval_flow: Array.isArray(r.approval_flow) ? r.approval_flow : [],
    }));

    // ── 5. 全申請を取得（横断検索用・created_at で月検索対応） ──
    const { data: allRequests } = await admin
        .from("ks_requests")
        .select("id, date, applicant_name, category, reason, total_amount, club_id, receipt_url, approval_flow, rejection_reason, status, revision_number, created_at")
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

                {/* ═══ 部活動別予算（カード型＋上部検索・1部活1件） ═══ */}
                <AdminClubCards clubs={clubList} />

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

                    <AdminActions requests={pendingWithClub} clubs={clubList.map((c) => ({ id: c.id, name: c.name }))} />
                </section>

                {/* ═══ 全申請横断検索 ═══ */}
                <section className="mt-10">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Search className="w-5 h-5 text-indigo-400" />
                        全申請横断検索
                    </h2>

                    <AdminSearch
                        requests={allWithClub}
                        clubs={clubList.map((c) => ({ id: c.id, name: c.name }))}
                    />
                </section>
            </div>
        </div>
    );
}
