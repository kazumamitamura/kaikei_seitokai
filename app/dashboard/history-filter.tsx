"use client";

import { useState, useMemo } from "react";
import { Search, Filter, Calendar, XCircle, CheckCircle2, Clock, ExternalLink, Edit3, Loader2, X, Lock } from "lucide-react";
import Link from "next/link";
import { resubmitRequest } from "./resubmit-action";

interface HistoryItem {
    id: string;
    date: string;
    category: string;
    reason: string;
    applicant_name: string;
    total_amount: number;
    status: string;
    signedReceiptUrl: string | null;
    revision_number?: number;
    created_at?: string;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    draft: { label: "下書き", color: "text-slate-400", bg: "bg-slate-500/10" },
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

export default function HistoryFilter({ items }: { items: HistoryItem[] }) {
    const [statusFilter, setStatusFilter] = useState("all");
    const [monthFrom, setMonthFrom] = useState("");
    const [monthTo, setMonthTo] = useState("");
    const [keyword, setKeyword] = useState("");
    const [error, setError] = useState<string | null>(null);

    const filtered = useMemo(() => {
        return items.filter((item) => {
            // ステータスフィルター（全ステータスを正しく扱う）
            if (statusFilter !== "all" && item.status !== statusFilter) return false;

            // 月フィルター — 記載日(date)または申請日(created_at)のいずれかが範囲内なら表示
            const itemDateMonth = (item.date || "").toString().substring(0, 7);
            const itemCreatedMonth = (item.created_at || "").toString().substring(0, 7);
            if (monthFrom) {
                const inRangeByDate = itemDateMonth >= monthFrom;
                const inRangeByCreated = itemCreatedMonth && itemCreatedMonth >= monthFrom;
                if (!inRangeByDate && !inRangeByCreated) return false;
            }
            if (monthTo) {
                const inRangeByDate = !itemDateMonth || itemDateMonth <= monthTo;
                const inRangeByCreated = !itemCreatedMonth || itemCreatedMonth <= monthTo;
                if (!inRangeByDate && !inRangeByCreated) return false;
            }

            // キーワードフィルター
            if (keyword) {
                const kw = keyword.toLowerCase();
                const match =
                    (item.category || "").toLowerCase().includes(kw) ||
                    (item.reason || "").toLowerCase().includes(kw) ||
                    (item.applicant_name || "").toLowerCase().includes(kw);
                if (!match) return false;
            }
            return true;
        });
    }, [items, statusFilter, monthFrom, monthTo, keyword]);

    const hasFilters = statusFilter !== "all" || monthFrom || monthTo || keyword;

    const clearFilters = () => {
        setStatusFilter("all");
        setMonthFrom("");
        setMonthTo("");
        setKeyword("");
    };

    // 編集可能かどうか（rejected のみ → 編集画面へ遷移）
    const canEdit = (status: string) => status === "rejected";
    const isLocked = (status: string) => status === "submitted" || status === "approved";

    return (
        <div>
            {/* ── フィルターバー ── */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                    <Filter className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">絞り込み</span>
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
                    {/* ステータス */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm
                            focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer"
                    >
                        <option value="all" className="bg-slate-900">全ステータス</option>
                        <option value="submitted" className="bg-slate-900">承認待ち</option>
                        <option value="approved" className="bg-slate-900">承認済み</option>
                        <option value="rejected" className="bg-slate-900">差し戻し</option>
                        <option value="paid" className="bg-slate-900">支払済み</option>
                    </select>
                    {/* 年月From */}
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                        <input
                            type="month"
                            value={monthFrom}
                            onChange={(e) => setMonthFrom(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm
                                focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        />
                    </div>
                    {/* 年月To */}
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                        <input
                            type="month"
                            value={monthTo}
                            onChange={(e) => setMonthTo(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm
                                focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        />
                    </div>
                </div>
            </div>

            {/* ── エラー ── */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-5 py-3 mb-3 flex items-center gap-2">
                    <span className="text-red-400 text-sm">⚠ {error}</span>
                    <button onClick={() => setError(null)} className="ml-auto text-red-400/60 hover:text-red-300">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* ── 件数 ── */}
            <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-slate-500">
                    {filtered.length} 件{hasFilters ? ` / 全 ${items.length} 件` : ""}
                </p>
            </div>

            {/* ── リスト ── */}
            {filtered.length === 0 ? (
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-10 text-center">
                    <p className="text-slate-400 text-sm">
                        {hasFilters ? "条件に一致する申請がありません。" : "まだ申請がありません。"}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((req) => {
                        const sc = statusConfig[req.status] || statusConfig.draft;
                        const rev = req.revision_number || 1;
                        const locked = isLocked(req.status);
                        const editable = canEdit(req.status);

                        return (
                            <div
                                key={req.id}
                                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5 hover:border-white/15 transition-all"
                            >
                                <div className="flex flex-col md:flex-row md:items-center gap-3">
                                    {/* ステータスバッジ */}
                                    <div className="flex items-center gap-2">
                                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${sc.bg} w-fit`}>
                                            {req.status === "approved" || req.status === "paid" ? (
                                                <CheckCircle2 className={`w-3.5 h-3.5 ${sc.color}`} />
                                            ) : req.status === "rejected" ? (
                                                <XCircle className={`w-3.5 h-3.5 ${sc.color}`} />
                                            ) : (
                                                <Clock className={`w-3.5 h-3.5 ${sc.color}`} />
                                            )}
                                            <span className={`text-xs font-semibold ${sc.color}`}>{sc.label}</span>
                                        </div>
                                        {rev > 1 && (
                                            <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded font-medium">
                                                第{rev}版
                                            </span>
                                        )}
                                        {locked && (
                                            <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-600 bg-slate-500/10 px-1.5 py-0.5 rounded">
                                                <Lock className="w-2.5 h-2.5" />
                                                ロック
                                            </span>
                                        )}
                                    </div>

                                    {/* 申請情報 */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-white font-medium truncate">
                                            {req.category || "カテゴリなし"}
                                            {req.reason ? ` — ${req.reason}` : ""}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {req.date} ・ {req.applicant_name}
                                        </p>
                                    </div>

                                    {/* 金額 + アクション */}
                                    <div className="flex items-center gap-3">
                                        {req.signedReceiptUrl && (
                                            <a
                                                href={req.signedReceiptUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                領収書
                                            </a>
                                        )}

                                        {/* 差し戻し → 編集画面へ（rejectedのみ表示） */}
                                        {editable && (
                                            <Link
                                                href={`/requests/${req.id}/edit`}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg
                                                    bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium
                                                    hover:bg-amber-500/20 transition-all"
                                            >
                                                <Edit3 className="w-3 h-3" />
                                                修正・再提出
                                            </Link>
                                        )}

                                        <Link
                                            href={`/admin/${req.id}`}
                                            className="text-xs text-slate-500 hover:text-indigo-400 transition-colors"
                                        >
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
