"use client";

import { useState, useMemo, useCallback } from "react";
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

interface AppliedFilters {
    club: string;
    status: string;
    month: string;
    keyword: string;
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

/** 日付・タイムスタンプから YYYY-MM を安全に取得（Supabaseの date / timestamptz 両対応） */
function getMonthFromValue(value: unknown): string {
    if (value == null) return "";
    if (typeof value === "string") {
        const s = value.trim();
        if (s.length >= 7 && /^\d{4}-\d{2}/.test(s)) return s.substring(0, 7);
        const d = new Date(s);
        if (!Number.isNaN(d.getTime())) return d.toISOString().substring(0, 7);
        return "";
    }
    if (typeof value === "object" && "getFullYear" in (value as Date)) {
        const d = value as Date;
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        return `${y}-${String(m).padStart(2, "0")}`;
    }
    return "";
}

export default function AdminSearch({
    requests,
    clubs,
}: {
    requests: RequestItem[];
    clubs: Club[];
}) {
    const [clubFilter, setClubFilter] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [monthSelect, setMonthSelect] = useState<string>("");
    const [keyword, setKeyword] = useState<string>("");
    const [applied, setApplied] = useState<AppliedFilters>({
        club: "all",
        status: "all",
        month: "",
        keyword: "",
    });

    const runSearch = useCallback(() => {
        setApplied({
            club: clubFilter,
            status: statusFilter,
            month: monthSelect,
            keyword: keyword.trim(),
        });
    }, [clubFilter, statusFilter, monthSelect, keyword]);

    const filtered = useMemo(() => {
        return requests.filter((req) => {
            if (applied.club !== "all" && (req.club_name ?? "") !== applied.club) return false;
            if (applied.status !== "all" && (req.status ?? "") !== applied.status) return false;

            if ((applied.month ?? "").length > 0) {
                const reqDateMonth = getMonthFromValue(req.date);
                const reqCreatedMonth = getMonthFromValue(req.created_at);
                const targetMonth = applied.month.substring(0, 7);
                const match =
                    (reqDateMonth.length >= 7 && reqDateMonth === targetMonth) ||
                    (reqCreatedMonth.length >= 7 && reqCreatedMonth === targetMonth);
                if (!match) return false;
            }

            const kw = (applied.keyword ?? "").toLowerCase();
            if (kw.length > 0) {
                const match =
                    (req.category ?? "").toLowerCase().includes(kw) ||
                    (req.reason ?? "").toLowerCase().includes(kw) ||
                    (req.applicant_name ?? "").toLowerCase().includes(kw) ||
                    (req.club_name ?? "").toLowerCase().includes(kw);
                if (!match) return false;
            }
            return true;
        });
    }, [requests, applied]);

    const hasFilters = applied.club !== "all" || applied.status !== "all" || (applied.month ?? "").length > 0 || (applied.keyword ?? "").length > 0;

    const clearFilters = useCallback(() => {
        setClubFilter("all");
        setStatusFilter("all");
        setMonthSelect("");
        setKeyword("");
        setApplied({ club: "all", status: "all", month: "", keyword: "" });
    }, []);

    return (
        <div>
            {/* ── フィルター ── */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                    <Filter className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">横断検索</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    {/* キーワード */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                        <input
                            type="text"
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && runSearch()}
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
                                <option key={c?.id ?? ""} value={c?.name ?? ""} className="bg-slate-900">{c?.name ?? ""}</option>
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
                            onChange={(e) => setMonthSelect(e.target.value ?? "")}
                            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm
                                focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                            title="表示する月を選択"
                        />
                    </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                    <button
                        type="button"
                        onClick={runSearch}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold
                            focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors"
                    >
                        <Search className="w-4 h-4" />
                        検索
                    </button>
                    {hasFilters && (
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="text-xs text-slate-500 hover:text-white transition-colors"
                        >
                            クリア
                        </button>
                    )}
                </div>
            </div>

            {/* ── 結果件数 ── */}
            <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-slate-500">
                    {filtered.length} 件{hasFilters ? ` / 全 ${requests?.length ?? 0} 件` : ""}
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
                                            {fmt.format(Number(req?.total_amount ?? 0))}
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
