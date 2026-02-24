"use client";

import { useState, useMemo } from "react";
import { Search, Filter, Calendar, ChevronDown, Eye, Clock, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { ApprovalEntry } from "./types";

interface RequestItem {
    id: string;
    date: string;
    applicant_name: string;
    category: string;
    reason: string;
    total_amount: number;
    club_name: string;
    receipt_url: string | null;
    approval_flow: ApprovalEntry[];
    rejection_reason: string | null;
    status: string;
    revision_number?: number;
    created_at?: string;
}

interface Club {
    id: string;
    name: string;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    submitted: { label: "承認待ち", color: "text-amber-300", bg: "bg-amber-500/10" },
    approved: { label: "承認済み", color: "text-emerald-300", bg: "bg-emerald-500/10" },
    rejected: { label: "差し戻し", color: "text-red-300", bg: "bg-red-500/10" },
    paid: { label: "支払済み", color: "text-blue-300", bg: "bg-blue-500/10" },
};

const fmt = new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
});

export default function AdminSearch({
    requests,
    clubs,
}: {
    requests: RequestItem[];
    clubs: Club[];
}) {
    const [clubFilter, setClubFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [monthSelect, setMonthSelect] = useState("");
    const [keyword, setKeyword] = useState("");

    const filtered = useMemo(() => {
        return requests.filter((req) => {
            if (clubFilter !== "all" && req.club_name !== clubFilter) return false;
            if (statusFilter !== "all" && req.status !== statusFilter) return false;

            // 単一月フィルター — 選択した月のデータのみ（記載日または申請日がその月）
            if (monthSelect) {
                const reqDateMonth = (req.date || "").toString().substring(0, 7);
                const reqCreatedMonth = (req.created_at || "").toString().substring(0, 7);
                const matchMonth = reqDateMonth === monthSelect || reqCreatedMonth === monthSelect;
                if (!matchMonth) return false;
            }

            if (keyword) {
                const kw = keyword.toLowerCase();
                const match =
                    (req.category || "").toLowerCase().includes(kw) ||
                    (req.reason || "").toLowerCase().includes(kw) ||
                    (req.applicant_name || "").toLowerCase().includes(kw) ||
                    (req.club_name || "").toLowerCase().includes(kw);
                if (!match) return false;
            }
            return true;
        });
    }, [requests, clubFilter, statusFilter, monthSelect, keyword]);

    const hasFilters = clubFilter !== "all" || statusFilter !== "all" || !!monthSelect || !!keyword;

    const clearFilters = () => {
        setClubFilter("all");
        setStatusFilter("all");
        setMonthSelect("");
        setKeyword("");
    };

    return (
        <div>
            {/* ── フィルター ── */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                    <Filter className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">横断検索</span>
                    {hasFilters && (
                        <button onClick={clearFilters} className="ml-auto text-xs text-slate-500 hover:text-white transition-colors">
                            クリア
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    {/* キーワード */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                        <input
                            type="text"
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            placeholder="科目・事由・申請者"
                            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm
                                placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        />
                    </div>
                    {/* 部活動 */}
                    <div className="relative">
                        <select
                            value={clubFilter}
                            onChange={(e) => setClubFilter(e.target.value)}
                            className="w-full appearance-none px-3 py-2 pr-8 rounded-lg bg-white/5 border border-white/10 text-white text-sm
                                focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
                        >
                            <option value="all" className="bg-slate-900">全部活動</option>
                            {clubs.map((c) => (
                                <option key={c.id} value={c.name} className="bg-slate-900">{c.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                    </div>
                    {/* ステータス */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="appearance-none px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm
                            focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
                    >
                        <option value="all" className="bg-slate-900">全ステータス</option>
                        <option value="submitted" className="bg-slate-900">承認待ち</option>
                        <option value="approved" className="bg-slate-900">承認済み</option>
                        <option value="rejected" className="bg-slate-900">差し戻し</option>
                        <option value="paid" className="bg-slate-900">支払済み</option>
                    </select>
                    {/* 単一月選択 */}
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                        <input
                            type="month"
                            value={monthSelect}
                            onChange={(e) => setMonthSelect(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm
                                focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                            title="表示する月を選択"
                        />
                    </div>
                </div>
            </div>

            {/* ── 結果件数 ── */}
            <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-slate-500">
                    {filtered.length} 件{hasFilters ? ` / 全 ${requests.length} 件` : ""}
                </p>
            </div>

            {/* ── 検索結果リスト ── */}
            {filtered.length === 0 ? (
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-10 text-center">
                    <p className="text-slate-400 text-sm">
                        {hasFilters ? "条件に一致する申請がありません。" : "申請データがありません。"}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((req) => {
                        const sc = statusConfig[req.status] || statusConfig.submitted;
                        const flow: ApprovalEntry[] = Array.isArray(req.approval_flow) ? req.approval_flow : [];
                        const approvedCount = flow.length;
                        const rev = req.revision_number || 1;

                        return (
                            <div
                                key={req.id}
                                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5 hover:border-white/15 transition-all"
                            >
                                <div className="flex flex-col md:flex-row md:items-center gap-3">
                                    {/* バッジ群 */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${sc.bg}`}>
                                            {req.status === "approved" || req.status === "paid" ? (
                                                <CheckCircle2 className={`w-3.5 h-3.5 ${sc.color}`} />
                                            ) : req.status === "rejected" ? (
                                                <XCircle className={`w-3.5 h-3.5 ${sc.color}`} />
                                            ) : (
                                                <Clock className={`w-3.5 h-3.5 ${sc.color}`} />
                                            )}
                                            <span className={`text-xs font-semibold ${sc.color}`}>{sc.label}</span>
                                        </div>
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 text-[10px] font-medium">
                                            {req.club_name}
                                        </span>
                                        {rev > 1 && (
                                            <span className="text-[10px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded font-medium">
                                                第{rev}版
                                            </span>
                                        )}
                                        {req.status === "submitted" && approvedCount > 0 && (
                                            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                                {approvedCount}/5承認
                                            </span>
                                        )}
                                    </div>

                                    {/* 情報 */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-white font-medium truncate">
                                            {req.category || "カテゴリなし"} — {req.reason || "事由なし"}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {req.date} ・ {req.applicant_name}
                                        </p>
                                    </div>

                                    {/* 金額 + リンク */}
                                    <div className="flex items-center gap-3">
                                        {req.receipt_url && (
                                            <span className="text-xs text-indigo-400 flex items-center gap-1">
                                                <ExternalLink className="w-3 h-3" />
                                                領収書
                                            </span>
                                        )}
                                        <Link
                                            href={`/admin/${req.id}`}
                                            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-300 transition-colors"
                                        >
                                            <Eye className="w-3 h-3" />
                                            詳細
                                        </Link>
                                        <p className="text-lg font-bold text-white tabular-nums">
                                            {fmt.format(Number(req.total_amount))}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
