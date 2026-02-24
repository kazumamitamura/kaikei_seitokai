"use client";

import { useState, useMemo } from "react";
import { Check, X, Loader2, ExternalLink, ChevronDown, Stamp, Eye, Filter } from "lucide-react";
import Link from "next/link";
import { approveAsRole, rejectWithReason } from "./actions";
import { APPROVAL_ROLES } from "./types";
import type { ApprovalEntry, ApprovalRole } from "./types";

interface PendingRequest {
    id: string;
    date: string;
    applicant_name: string;
    category: string;
    reason: string;
    total_amount: number;
    club_id: string;
    club_name: string;
    receipt_url: string | null;
    approval_flow: ApprovalEntry[];
    rejection_reason: string | null;
    status: string;
}

interface Club {
    id: string;
    name: string;
}

function ApprovalStamps({ flow }: { flow: ApprovalEntry[] }) {
    const approvedRoles = new Set(flow.map((e) => e.role));

    return (
        <div className="flex flex-wrap gap-1.5 mt-2">
            {APPROVAL_ROLES.map((role) => {
                const entry = flow.find((e) => e.role === role);
                const isApproved = approvedRoles.has(role);

                return (
                    <div
                        key={role}
                        className={`flex flex-col items-center px-2 py-1 rounded-md border text-center min-w-[64px]
                            ${isApproved
                                ? "border-emerald-500/30 bg-emerald-500/5"
                                : "border-white/5 bg-white/[0.01]"}`}
                        title={entry ? `${entry.name} (${new Date(entry.approved_at).toLocaleDateString("ja-JP")})` : "未承認"}
                    >
                        <span className={`text-[10px] font-medium ${isApproved ? "text-emerald-400" : "text-slate-600"}`}>
                            {role}
                        </span>
                        {isApproved && entry ? (
                            <span className="text-[9px] text-emerald-300/70 mt-0.5 truncate max-w-[60px]">
                                {entry.name}
                            </span>
                        ) : (
                            <span className="text-[9px] text-slate-700 mt-0.5">—</span>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export default function AdminActions({ requests, clubs }: { requests: PendingRequest[]; clubs: Club[] }) {
    const [clubFilter, setClubFilter] = useState("all");
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [processedIds, setProcessedIds] = useState<Record<string, "approved" | "rejected">>({});
    const [error, setError] = useState<string | null>(null);

    // 承認用: 選択中の役職
    const [selectedRole, setSelectedRole] = useState<Record<string, ApprovalRole>>({});
    const [approverName, setApproverName] = useState<Record<string, string>>({});

    // 返却用: 返却理由入力モード
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState("");
    const [rejectorName, setRejectorName] = useState("");

    const fmt = new Intl.NumberFormat("ja-JP", {
        style: "currency",
        currency: "JPY",
        maximumFractionDigits: 0,
    });

    const handleApprove = async (id: string) => {
        const role = selectedRole[id];
        if (!role) {
            setError("承認する役職を選択してください。");
            return;
        }
        const name = approverName[id]?.trim();
        if (!name) {
            setError("承認者名を入力してください。");
            return;
        }

        setProcessingId(id);
        setError(null);
        const result = await approveAsRole(id, role, name);
        setProcessingId(null);
        if (result.error) {
            setError(result.error);
        } else {
            setProcessedIds((prev) => ({ ...prev, [id]: "approved" }));
        }
    };

    const handleReject = async (id: string) => {
        if (!rejectReason.trim()) {
            setError("返却理由を入力してください。");
            return;
        }

        setProcessingId(id);
        setError(null);
        const result = await rejectWithReason(id, rejectReason, rejectorName);
        setProcessingId(null);
        if (result.error) {
            setError(result.error);
        } else {
            setProcessedIds((prev) => ({ ...prev, [id]: "rejected" }));
            setRejectingId(null);
            setRejectReason("");
            setRejectorName("");
        }
    };

    const filtered = useMemo(() => {
        if (clubFilter === "all") return requests;
        return requests.filter((r) => r.club_id === clubFilter);
    }, [requests, clubFilter]);

    if (requests.length === 0) {
        return (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-10 text-center">
                <p className="text-slate-400 text-sm">承認待ちの申請はありません</p>
            </div>
        );
    }

    if (filtered.length === 0) {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                    <Filter className="w-4 h-4 text-slate-500" />
                    <select
                        value={clubFilter}
                        onChange={(e) => setClubFilter(e.target.value)}
                        className="appearance-none px-3 py-2 pr-8 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
                    >
                        <option value="all" className="bg-slate-900">全部活動</option>
                        {clubs.map((c) => (
                            <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>
                        ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500 pointer-events-none -ml-6" />
                </div>
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-10 text-center">
                    <p className="text-slate-400 text-sm">選択した部活動に承認待ちの申請はありません</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* 部活動フィルター */}
            <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4 text-slate-500" />
                <select
                    value={clubFilter}
                    onChange={(e) => setClubFilter(e.target.value)}
                    className="appearance-none px-3 py-2 pr-8 rounded-lg bg-white/5 border border-white/10 text-white text-sm
                        focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
                >
                    <option value="all" className="bg-slate-900">全部活動</option>
                    {clubs.map((c) => (
                        <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>
                    ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 pointer-events-none -ml-6" />
                <span className="text-xs text-slate-500">{filtered.length} 件</span>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-5 py-3 flex items-center gap-2">
                    <span className="text-red-400 text-sm">⚠ {error}</span>
                    <button onClick={() => setError(null)} className="ml-auto text-red-400/60 hover:text-red-300">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {filtered.map((req) => {
                const processed = processedIds[req.id];
                const isProcessing = processingId === req.id;
                const isRejecting = rejectingId === req.id;
                const flow: ApprovalEntry[] = Array.isArray(req.approval_flow) ? req.approval_flow : [];

                return (
                    <div
                        key={req.id}
                        className={`bg-white/5 backdrop-blur-xl border rounded-xl p-5 transition-all ${processed
                            ? processed === "approved"
                                ? "border-emerald-500/20 opacity-60"
                                : "border-red-500/20 opacity-60"
                            : "border-white/10"
                            }`}
                    >
                        {/* 申請情報 */}
                        <div className="flex flex-col md:flex-row md:items-start gap-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 text-xs font-medium">
                                        {req.club_name}
                                    </span>
                                    <span className="text-xs text-slate-500">{req.date}</span>
                                </div>
                                <p className="text-white font-medium text-sm truncate">
                                    {req.category || "カテゴリなし"} — {req.reason || "事由なし"}
                                </p>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="text-xs text-slate-400">
                                        申請者: {req.applicant_name}
                                    </span>
                                    {req.receipt_url && (
                                        <span className="text-xs text-indigo-400 flex items-center gap-1">
                                            <ExternalLink className="w-3 h-3" />
                                            領収書あり
                                        </span>
                                    )}
                                </div>

                                {/* 承認フロー進捗 */}
                                <ApprovalStamps flow={flow} />
                            </div>

                            {/* 金額 + 詳細リンク */}
                            <div className="text-right flex flex-col items-end gap-2">
                                <p className="text-lg font-bold text-white tabular-nums">
                                    {fmt.format(Number(req.total_amount))}
                                </p>
                                <Link
                                    href={`/admin/${req.id}`}
                                    className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                                >
                                    <Eye className="w-3 h-3" />
                                    詳細・印刷
                                </Link>
                            </div>
                        </div>

                        {/* アクションエリア */}
                        {!processed && (
                            <div className="mt-4 pt-4 border-t border-white/5">
                                {isRejecting ? (
                                    /* 返却理由入力モード */
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1">返却者名</label>
                                            <input
                                                type="text"
                                                value={rejectorName}
                                                onChange={(e) => setRejectorName(e.target.value)}
                                                placeholder="例: 鈴木 一郎"
                                                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm
                                                    placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1">返却理由（必須）</label>
                                            <textarea
                                                value={rejectReason}
                                                onChange={(e) => setRejectReason(e.target.value)}
                                                placeholder="理由を入力してください..."
                                                rows={3}
                                                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-red-500/20 text-white text-sm
                                                    placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleReject(req.id)}
                                                disabled={isProcessing || !rejectReason.trim()}
                                                className="flex items-center gap-1.5 px-4 py-2 rounded-lg
                                                    bg-red-500/10 border border-red-500/20 text-red-300 text-sm font-medium
                                                    hover:bg-red-500/20 active:scale-[0.98]
                                                    disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                            >
                                                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                                                返却を確定
                                            </button>
                                            <button
                                                onClick={() => { setRejectingId(null); setRejectReason(""); setRejectorName(""); }}
                                                className="px-4 py-2 rounded-lg text-slate-400 text-sm hover:text-white transition-colors"
                                            >
                                                キャンセル
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    /* 承認・返却ボタン */
                                    <div className="flex flex-col md:flex-row gap-3">
                                        {/* 承認セクション */}
                                        <div className="flex items-center gap-2 flex-1">
                                            <input
                                                type="text"
                                                value={approverName[req.id] || ""}
                                                onChange={(e) => setApproverName((p) => ({ ...p, [req.id]: e.target.value }))}
                                                placeholder="承認者名"
                                                className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm
                                                    placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-32"
                                            />
                                            <div className="relative">
                                                <select
                                                    value={selectedRole[req.id] || ""}
                                                    onChange={(e) => setSelectedRole((p) => ({ ...p, [req.id]: e.target.value as ApprovalRole }))}
                                                    className="appearance-none px-3 py-2 pr-8 rounded-lg bg-white/5 border border-white/10
                                                        text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
                                                >
                                                    <option value="" className="bg-slate-900">役職を選択</option>
                                                    {APPROVAL_ROLES.map((role) => {
                                                        const alreadyDone = flow.some((e) => e.role === role);
                                                        return (
                                                            <option key={role} value={role} disabled={alreadyDone} className="bg-slate-900">
                                                                {alreadyDone ? `✓ ${role}` : role}
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                                            </div>
                                            <button
                                                onClick={() => handleApprove(req.id)}
                                                disabled={isProcessing || !selectedRole[req.id] || !approverName[req.id]?.trim()}
                                                className="flex items-center gap-1.5 px-4 py-2 rounded-lg
                                                    bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm font-medium
                                                    hover:bg-emerald-500/20 active:scale-[0.98]
                                                    disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                            >
                                                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Stamp className="w-3.5 h-3.5" />}
                                                承認
                                            </button>
                                        </div>

                                        {/* 返却ボタン */}
                                        <button
                                            onClick={() => setRejectingId(req.id)}
                                            disabled={isProcessing}
                                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg
                                                bg-red-500/10 border border-red-500/20 text-red-300 text-sm font-medium
                                                hover:bg-red-500/20 active:scale-[0.98]
                                                disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                            返却
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 処理済み表示 */}
                        {processed && (
                            <div className="mt-3 pt-3 border-t border-white/5">
                                <span
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${processed === "approved"
                                        ? "bg-emerald-500/10 text-emerald-300"
                                        : "bg-red-500/10 text-red-300"
                                        }`}
                                >
                                    {processed === "approved" ? "✓ 承認済み" : "✗ 差し戻し完了"}
                                </span>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
