import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import PrintButton from "./print-button";
import { APPROVAL_ROLES } from "../types";
import type { ApprovalEntry } from "../types";

export default async function RequestDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supabase = await createClient();

    // ── 認証チェック ──
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const admin = createAdminClient();

    // ── 申請データ取得 ──
    const { data: request, error } = await admin
        .from("ks_requests")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !request) notFound();

    // ── 明細データ取得 ──
    const { data: items } = await admin
        .from("ks_request_items")
        .select("*")
        .eq("request_id", id)
        .order("sort_order");

    // ── 部活動名取得 ──
    const { data: club } = await admin
        .from("ks_clubs")
        .select("name")
        .eq("id", request.club_id)
        .single();

    // ── 領収書の署名付きURL ──
    let signedReceiptUrl: string | null = null;
    if (request.receipt_url) {
        const { data: signedData } = await admin.storage
            .from("ks_receipts")
            .createSignedUrl(request.receipt_url, 3600);
        signedReceiptUrl = signedData?.signedUrl ?? null;
    }

    const approvalFlow: ApprovalEntry[] = Array.isArray(request.approval_flow)
        ? request.approval_flow
        : [];

    const fmt = (n: number) =>
        new Intl.NumberFormat("ja-JP", {
            style: "currency",
            currency: "JPY",
            maximumFractionDigits: 0,
        }).format(n);

    const statusLabel: Record<string, string> = {
        draft: "下書き",
        submitted: "承認待ち",
        approved: "承認済み",
        rejected: "差し戻し",
        paid: "支払済み",
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 print:bg-white print:min-h-0">
            <div className="fixed inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-60 pointer-events-none print:hidden" />

            <div className="relative max-w-4xl mx-auto px-4 py-8 print:max-w-none print:px-0 print:py-0">
                {/* ═══ 画面用ヘッダー（印刷時非表示） ═══ */}
                <header className="mb-8 print:hidden">
                    <div className="flex items-center justify-between">
                        <Link
                            href="/admin"
                            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            管理画面に戻る
                        </Link>
                        <PrintButton />
                    </div>
                </header>

                {/* ═══ 印刷用決裁書 ═══ */}
                <div className="print:p-[15mm] print:text-black">

                    {/* ── 印刷用タイトル ── */}
                    <div className="hidden print:block text-center mb-6">
                        <h1 className="text-2xl font-bold tracking-widest border-b-2 border-black pb-2 inline-block">
                            購 入 申 請 書
                        </h1>
                    </div>

                    {/* ── 画面用タイトル + リビジョン ── */}
                    <div className="mb-6 print:hidden">
                        <h1 className="text-xl font-bold text-white flex items-center gap-3">
                            申請詳細
                            {(request.revision_number || 1) > 1 && (
                                <span className="text-sm text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded font-medium">
                                    第{request.revision_number}版
                                </span>
                            )}
                        </h1>
                    </div>

                    {/* ── 印刷用リビジョン表示 ── */}
                    {(request.revision_number || 1) > 1 && (
                        <div className="hidden print:block text-right text-xs mb-2">
                            提出回数: 第{request.revision_number}版
                        </div>
                    )}

                    {/* ── 電子印鑑枠（印刷用 + 画面用） ── */}
                    <div className="mb-8">
                        <h2 className="text-sm font-semibold text-slate-400 mb-3 print:text-black print:text-xs print:mb-2">
                            決裁欄
                        </h2>
                        <div className="flex gap-0 justify-end">
                            {[...APPROVAL_ROLES].reverse().map((role) => {
                                const entry = approvalFlow.find((e) => e.role === role);
                                return (
                                    <div
                                        key={role}
                                        className="hanko-cell w-[72px] flex flex-col border border-white/10 print:border-black/80"
                                    >
                                        {/* 役職名 */}
                                        <div className="text-[10px] text-center py-1 border-b border-white/10 text-slate-400 font-medium
                                            print:border-black/80 print:text-black print:bg-gray-50 print:text-[9px]">
                                            {role}
                                        </div>
                                        {/* スタンプ枠 */}
                                        <div className="h-[72px] flex items-center justify-center p-1
                                            print:h-[68px]">
                                            {entry ? (
                                                <div className="hanko-stamp text-center">
                                                    <div className="text-xs font-bold text-red-400 print:text-red-600 leading-tight">
                                                        {entry.name}
                                                    </div>
                                                    <div className="text-[8px] text-red-400/70 print:text-red-600/70 mt-0.5">
                                                        {new Date(entry.approved_at).toLocaleDateString("ja-JP", {
                                                            year: "2-digit",
                                                            month: "2-digit",
                                                            day: "2-digit",
                                                        })}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-slate-700 text-[10px] print:text-gray-300">
                                                    未承認
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── 基本情報 ── */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 mb-6
                        print:bg-transparent print:border-black/20 print:rounded-none print:p-4">
                        <div className="hidden print:block text-right text-xs text-gray-500 mb-2">
                            申請ID: {request.id.slice(0, 8)}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 print:gap-2">
                            <div>
                                <span className="text-xs text-slate-500 print:text-gray-500">記載日</span>
                                <p className="text-sm text-white font-medium print:text-black">{request.date}</p>
                            </div>
                            <div>
                                <span className="text-xs text-slate-500 print:text-gray-500">部活動</span>
                                <p className="text-sm text-white font-medium print:text-black">{club?.name ?? "不明"}</p>
                            </div>
                            <div>
                                <span className="text-xs text-slate-500 print:text-gray-500">ステータス</span>
                                <p className="text-sm text-white font-medium print:text-black">
                                    {statusLabel[request.status] || request.status}
                                </p>
                            </div>
                            <div>
                                <span className="text-xs text-slate-500 print:text-gray-500">職名</span>
                                <p className="text-sm text-white font-medium print:text-black">{request.job_title}</p>
                            </div>
                            <div>
                                <span className="text-xs text-slate-500 print:text-gray-500">申請者</span>
                                <p className="text-sm text-white font-medium print:text-black">{request.applicant_name}</p>
                            </div>
                            <div>
                                <span className="text-xs text-slate-500 print:text-gray-500">科目</span>
                                <p className="text-sm text-white font-medium print:text-black">{request.category || "—"}</p>
                            </div>
                            <div className="col-span-2 md:col-span-3">
                                <span className="text-xs text-slate-500 print:text-gray-500">事由</span>
                                <p className="text-sm text-white font-medium print:text-black">{request.reason || "—"}</p>
                            </div>
                            <div className="col-span-2 md:col-span-3">
                                <span className="text-xs text-slate-500 print:text-gray-500">支払先</span>
                                <p className="text-sm text-white font-medium print:text-black">{request.payee || "—"}</p>
                            </div>
                        </div>
                    </div>

                    {/* ── 明細テーブル ── */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden mb-6
                        print:bg-transparent print:border-black/20 print:rounded-none">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/10 print:border-black/20">
                                    <th className="text-left text-xs font-medium text-slate-400 px-4 py-3 print:text-black print:py-2">
                                        No.
                                    </th>
                                    <th className="text-left text-xs font-medium text-slate-400 px-4 py-3 print:text-black print:py-2">
                                        品名
                                    </th>
                                    <th className="text-right text-xs font-medium text-slate-400 px-4 py-3 print:text-black print:py-2">
                                        数量
                                    </th>
                                    <th className="text-right text-xs font-medium text-slate-400 px-4 py-3 print:text-black print:py-2">
                                        単価
                                    </th>
                                    <th className="text-right text-xs font-medium text-slate-400 px-4 py-3 print:text-black print:py-2">
                                        金額
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 print:divide-black/10">
                                {(items ?? []).map((item, i) => (
                                    <tr key={item.id} className="hover:bg-white/[0.02] print:hover:bg-transparent">
                                        <td className="px-4 py-2.5 text-xs text-slate-500 print:text-gray-500 tabular-nums">
                                            {i + 1}
                                        </td>
                                        <td className="px-4 py-2.5 text-sm text-white print:text-black">
                                            {item.item_name}
                                        </td>
                                        <td className="px-4 py-2.5 text-sm text-slate-300 text-right tabular-nums print:text-black">
                                            {item.quantity}
                                        </td>
                                        <td className="px-4 py-2.5 text-sm text-slate-300 text-right tabular-nums print:text-black">
                                            {fmt(Number(item.unit_price))}
                                        </td>
                                        <td className="px-4 py-2.5 text-sm text-white font-medium text-right tabular-nums print:text-black">
                                            {fmt(Number(item.amount))}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-white/10 print:border-black/30">
                                    <td colSpan={4} className="px-4 py-3 text-sm text-slate-400 font-semibold text-right print:text-black">
                                        合計
                                    </td>
                                    <td className="px-4 py-3 text-lg text-white font-bold text-right tabular-nums print:text-black">
                                        {fmt(Number(request.total_amount))}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* ── 領収書リンク ── */}
                    {signedReceiptUrl && (
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 mb-6
                            print:bg-transparent print:border-black/20 print:rounded-none">
                            <span className="text-xs text-slate-400 print:text-gray-500">領収書</span>
                            <a
                                href={signedReceiptUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 inline-flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 transition-colors
                                    print:text-black print:underline"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                領収書ファイルを開く
                            </a>
                            <p className="text-[10px] text-slate-600 mt-1 print:text-gray-400">
                                パス: {request.receipt_url}
                            </p>
                        </div>
                    )}

                    {/* ── 返却理由（差し戻しの場合） ── */}
                    {request.rejection_reason && (
                        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 mb-6
                            print:bg-transparent print:border-black/20 print:rounded-none">
                            <span className="text-xs text-red-400 print:text-red-600">返却理由</span>
                            <p className="text-sm text-red-300 mt-1 print:text-red-700">{request.rejection_reason}</p>
                        </div>
                    )}

                    {/* ── 承認履歴 ── */}
                    {approvalFlow.length > 0 && (
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4
                            print:bg-transparent print:border-black/20 print:rounded-none">
                            <span className="text-xs text-slate-400 print:text-gray-500 mb-2 block">承認履歴</span>
                            <div className="space-y-1">
                                {approvalFlow.map((entry, i) => (
                                    <div key={i} className="flex items-center gap-3 text-sm">
                                        <span className="text-emerald-400 print:text-emerald-700">✓</span>
                                        <span className="text-white print:text-black font-medium">{entry.role}</span>
                                        <span className="text-slate-400 print:text-gray-600">—</span>
                                        <span className="text-slate-300 print:text-gray-700">{entry.name}</span>
                                        <span className="text-xs text-slate-500 print:text-gray-500 ml-auto tabular-nums">
                                            {new Date(entry.approved_at).toLocaleString("ja-JP")}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── 印刷用フッター ── */}
                    <div className="hidden print:block mt-8 pt-4 border-t border-gray-300 text-xs text-gray-400 text-center">
                        <p>この書類は電子決裁システムにより出力されました — Kaikei Seitokai</p>
                        <p>出力日時: {new Date().toLocaleString("ja-JP")}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
