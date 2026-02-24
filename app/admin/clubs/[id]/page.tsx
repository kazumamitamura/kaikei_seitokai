import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ArrowLeft, Wallet } from "lucide-react";
import Link from "next/link";
import ClubCharts from "./club-charts";

export default async function AdminClubDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const admin = createAdminClient();

    const { data: club, error: clubError } = await admin
        .from("ks_clubs")
        .select("id, name, total_budget")
        .eq("id", id)
        .is("deleted_at", null)
        .single();

    if (clubError || !club) notFound();

    const { data: requests } = await admin
        .from("ks_requests")
        .select("category, total_amount, date, created_at")
        .eq("club_id", id)
        .in("status", ["approved", "paid"])
        .is("deleted_at", null);

    const list = requests ?? [];

    // 費目別集計（円グラフ用）
    const byCategory: Record<string, number> = {};
    list.forEach((r) => {
        const key = (r.category || "その他").trim() || "その他";
        byCategory[key] = (byCategory[key] || 0) + Number(r.total_amount);
    });
    const categoryData = Object.entries(byCategory)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    // 月別集計（棒グラフ用）
    const byMonth: Record<string, number> = {};
    list.forEach((r) => {
        const dateStr = (r.date || r.created_at || "").toString();
        const month = dateStr.substring(0, 7);
        if (month) {
            byMonth[month] = (byMonth[month] || 0) + Number(r.total_amount);
        }
    });
    const monthlyData = Object.entries(byMonth)
        .map(([month, amount]) => ({ month, amount, count: 0 }))
        .sort((a, b) => a.month.localeCompare(b.month));

    const totalBudget = Number(club.total_budget);
    const totalSpent = list.reduce((s, r) => s + Number(r.total_amount), 0);
    const remaining = totalBudget - totalSpent;
    const usagePct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    const fmt = (n: number) =>
        new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(n);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
            <div className="relative max-w-6xl mx-auto px-4 py-8">
                <header className="mb-8">
                    <Link
                        href="/admin"
                        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-4"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        管理画面に戻る
                    </Link>
                    <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-300 text-sm font-bold">
                            <Wallet className="w-4 h-4" />
                        </span>
                        {club.name} — 予算分析
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">費目別・月別の支出分析</p>

                    <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <p className="text-xs text-slate-500 uppercase tracking-wider">初期予算</p>
                            <p className="text-lg font-bold text-white tabular-nums mt-1">{fmt(totalBudget)}</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <p className="text-xs text-slate-500 uppercase tracking-wider">承認済み支出</p>
                            <p className="text-lg font-bold text-pink-300 tabular-nums mt-1">{fmt(totalSpent)}</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <p className="text-xs text-slate-500 uppercase tracking-wider">残額</p>
                            <p className={`text-lg font-bold tabular-nums mt-1 ${remaining < 0 ? "text-red-400" : "text-emerald-300"}`}>
                                {fmt(remaining)}
                            </p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <p className="text-xs text-slate-500 uppercase tracking-wider">消化率</p>
                            <p className="text-lg font-bold text-white tabular-nums mt-1">{usagePct.toFixed(1)}%</p>
                            <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full ${usagePct >= 100 ? "bg-red-500" : usagePct >= 80 ? "bg-amber-500" : "bg-indigo-500"}`}
                                    style={{ width: `${Math.min(usagePct, 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </header>

                <ClubCharts categoryData={categoryData} monthlyData={monthlyData} />
            </div>
        </div>
    );
}
