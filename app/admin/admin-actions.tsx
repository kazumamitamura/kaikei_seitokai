"use client";

import { useState } from "react";
import { Check, X, Loader2, ExternalLink } from "lucide-react";
import { approveRequest, rejectRequest } from "./actions";

interface PendingRequest {
    id: string;
    date: string;
    applicant_name: string;
    category: string;
    reason: string;
    total_amount: number;
    club_name: string;
    receipt_url: string | null;
}

export default function AdminActions({ requests }: { requests: PendingRequest[] }) {
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [processedIds, setProcessedIds] = useState<Record<string, "approved" | "rejected">>({});
    const [error, setError] = useState<string | null>(null);

    const fmt = new Intl.NumberFormat("ja-JP", {
        style: "currency",
        currency: "JPY",
        maximumFractionDigits: 0,
    });

    const handleApprove = async (id: string) => {
        setProcessingId(id);
        setError(null);
        const result = await approveRequest(id);
        setProcessingId(null);
        if (result.error) {
            setError(result.error);
        } else {
            setProcessedIds((prev) => ({ ...prev, [id]: "approved" }));
        }
    };

    const handleReject = async (id: string) => {
        setProcessingId(id);
        setError(null);
        const result = await rejectRequest(id);
        setProcessingId(null);
        if (result.error) {
            setError(result.error);
        } else {
            setProcessedIds((prev) => ({ ...prev, [id]: "rejected" }));
        }
    };

    if (requests.length === 0) {
        return (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-10 text-center">
                <p className="text-slate-400 text-sm">承認待ちの申請はありません</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-5 py-3 flex items-center gap-2">
                    <span className="text-red-400 text-sm">⚠ {error}</span>
                    <button onClick={() => setError(null)} className="ml-auto text-red-400/60 hover:text-red-300">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {requests.map((req) => {
                const processed = processedIds[req.id];
                const isProcessing = processingId === req.id;

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
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                            {/* 申請情報 */}
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
                            </div>

                            {/* 金額 */}
                            <div className="text-right">
                                <p className="text-lg font-bold text-white tabular-nums">
                                    {fmt.format(Number(req.total_amount))}
                                </p>
                            </div>

                            {/* アクションボタン */}
                            <div className="flex items-center gap-2">
                                {processed ? (
                                    <span
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${processed === "approved"
                                                ? "bg-emerald-500/10 text-emerald-300"
                                                : "bg-red-500/10 text-red-300"
                                            }`}
                                    >
                                        {processed === "approved" ? "✓ 承認済み" : "✗ 差し戻し"}
                                    </span>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => handleApprove(req.id)}
                                            disabled={isProcessing}
                                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg
                                                bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm font-medium
                                                hover:bg-emerald-500/20 active:scale-[0.98]
                                                disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                        >
                                            {isProcessing ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <Check className="w-3.5 h-3.5" />
                                            )}
                                            承認
                                        </button>
                                        <button
                                            onClick={() => handleReject(req.id)}
                                            disabled={isProcessing}
                                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg
                                                bg-red-500/10 border border-red-500/20 text-red-300 text-sm font-medium
                                                hover:bg-red-500/20 active:scale-[0.98]
                                                disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                        >
                                            {isProcessing ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <X className="w-3.5 h-3.5" />
                                            )}
                                            差し戻し
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
