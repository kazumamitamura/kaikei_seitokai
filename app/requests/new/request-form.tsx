"use client";

import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { Plus, Trash2, Send, Calculator } from "lucide-react";
import { useState } from "react";

interface ItemRow {
    item_name: string;
    quantity: number;
    unit_price: number;
}

interface RequestFormData {
    date: string;
    job_title: string;
    applicant_name: string;
    category: string;
    reason: string;
    payee: string;
    items: ItemRow[];
}

const MAX_ROWS = 30;
const DEFAULT_ROWS = 5;

function emptyRow(): ItemRow {
    return { item_name: "", quantity: 1, unit_price: 0 };
}

// ── 総合計を計算するサブコンポーネント ──
function GrandTotal({ control }: { control: ReturnType<typeof useForm<RequestFormData>>["control"] }) {
    const items = useWatch({ control, name: "items" });

    const grandTotal = (items ?? []).reduce((sum, item) => {
        const q = Number(item.quantity) || 0;
        const p = Number(item.unit_price) || 0;
        return sum + q * p;
    }, 0);

    const fmt = new Intl.NumberFormat("ja-JP", {
        style: "currency",
        currency: "JPY",
        maximumFractionDigits: 0,
    });

    return (
        <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-xl" />
            <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-8 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                    <Calculator className="w-5 h-5 text-indigo-400" />
                    <span className="text-sm font-medium text-slate-400 uppercase tracking-wider">
                        総合計金額
                    </span>
                </div>
                <p className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
                    {fmt.format(grandTotal)}
                </p>
            </div>
        </div>
    );
}

// ── 行ごとの金額表示 ──
function RowAmount({ control, index }: { control: ReturnType<typeof useForm<RequestFormData>>["control"]; index: number }) {
    const quantity = useWatch({ control, name: `items.${index}.quantity` });
    const unitPrice = useWatch({ control, name: `items.${index}.unit_price` });
    const amount = (Number(quantity) || 0) * (Number(unitPrice) || 0);

    const fmt = new Intl.NumberFormat("ja-JP", {
        style: "currency",
        currency: "JPY",
        maximumFractionDigits: 0,
    });

    return (
        <span className={`text-sm font-semibold tabular-nums ${amount > 0 ? "text-white" : "text-slate-600"}`}>
            {fmt.format(amount)}
        </span>
    );
}

export default function RequestForm({
    defaultApplicant,
    defaultJobTitle,
}: {
    defaultApplicant: string;
    defaultJobTitle: string;
}) {
    const [submitted, setSubmitted] = useState(false);

    const today = new Date().toISOString().split("T")[0];

    const {
        register,
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<RequestFormData>({
        defaultValues: {
            date: today,
            job_title: defaultJobTitle,
            applicant_name: defaultApplicant,
            category: "",
            reason: "",
            payee: "",
            items: Array.from({ length: DEFAULT_ROWS }, () => emptyRow()),
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "items",
    });

    const onSubmit = (data: RequestFormData) => {
        // フィルター: 品名が入力された行のみ
        const validItems = data.items.filter((item) => item.item_name.trim() !== "");
        console.log("📋 申請データ:", { ...data, items: validItems });
        setSubmitted(true);
        setTimeout(() => setSubmitted(false), 3000);
    };

    // ── 入力フィールド共通スタイル ──
    const inputClass =
        "w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all";

    const labelClass = "block text-xs font-medium text-slate-400 mb-1.5";

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* ═══ 上部: 基本情報 ═══ */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-5">申請情報</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* 記載日 */}
                    <div>
                        <label className={labelClass}>記載日</label>
                        <input
                            type="date"
                            {...register("date", { required: true })}
                            className={inputClass}
                        />
                    </div>

                    {/* 職名 */}
                    <div>
                        <label className={labelClass}>職名</label>
                        <input
                            type="text"
                            {...register("job_title", { required: true })}
                            placeholder="例: 事務担当"
                            className={inputClass}
                        />
                    </div>

                    {/* 申請者氏名 */}
                    <div>
                        <label className={labelClass}>申請者氏名</label>
                        <input
                            type="text"
                            {...register("applicant_name", { required: true })}
                            placeholder="例: 田中 太郎"
                            className={inputClass}
                        />
                    </div>

                    {/* 科目 */}
                    <div>
                        <label className={labelClass}>科目</label>
                        <input
                            type="text"
                            {...register("category")}
                            placeholder="例: 備品購入"
                            className={inputClass}
                        />
                    </div>

                    {/* 事由 */}
                    <div className="md:col-span-2">
                        <label className={labelClass}>事由</label>
                        <input
                            type="text"
                            {...register("reason")}
                            placeholder="例: 大会出場に伴うユニフォーム購入"
                            className={inputClass}
                        />
                    </div>

                    {/* 支払先 */}
                    <div className="md:col-span-3">
                        <label className={labelClass}>支払先</label>
                        <input
                            type="text"
                            {...register("payee")}
                            placeholder="例: 株式会社○○スポーツ"
                            className={inputClass}
                        />
                    </div>
                </div>
            </div>

            {/* ═══ 下部: 明細行 ═══ */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-semibold text-white">明細</h2>
                    <span className="text-xs text-slate-500">
                        {fields.length} / {MAX_ROWS} 行
                    </span>
                </div>

                {/* ヘッダー行 */}
                <div className="hidden md:grid md:grid-cols-[1fr_100px_120px_100px_40px] gap-3 mb-2 px-1">
                    <span className="text-xs font-medium text-slate-500">項目・品名</span>
                    <span className="text-xs font-medium text-slate-500">数量</span>
                    <span className="text-xs font-medium text-slate-500">単価</span>
                    <span className="text-xs font-medium text-slate-500 text-right">金額</span>
                    <span />
                </div>

                {/* 明細行 */}
                <div className="space-y-2">
                    {fields.map((field, index) => (
                        <div
                            key={field.id}
                            className="grid grid-cols-1 md:grid-cols-[1fr_100px_120px_100px_40px] gap-2 md:gap-3 items-center
                bg-white/[0.02] rounded-lg p-2 md:p-1 border border-white/5
                hover:border-white/10 transition-colors group"
                        >
                            {/* 品名 */}
                            <div>
                                <label className="md:hidden text-xs text-slate-500 mb-1 block">品名</label>
                                <input
                                    type="text"
                                    {...register(`items.${index}.item_name`)}
                                    placeholder={`品名 ${index + 1}`}
                                    className={inputClass}
                                />
                            </div>

                            {/* 数量 */}
                            <div>
                                <label className="md:hidden text-xs text-slate-500 mb-1 block">数量</label>
                                <input
                                    type="number"
                                    min={0}
                                    {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                                    className={`${inputClass} text-center tabular-nums
                    [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none
                    [&::-webkit-inner-spin-button]:appearance-none`}
                                />
                            </div>

                            {/* 単価 */}
                            <div>
                                <label className="md:hidden text-xs text-slate-500 mb-1 block">単価</label>
                                <input
                                    type="number"
                                    min={0}
                                    {...register(`items.${index}.unit_price`, { valueAsNumber: true })}
                                    placeholder="¥"
                                    className={`${inputClass} text-right tabular-nums
                    [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none
                    [&::-webkit-inner-spin-button]:appearance-none`}
                                />
                            </div>

                            {/* 金額（自動計算） */}
                            <div className="flex items-center justify-end md:justify-end">
                                <label className="md:hidden text-xs text-slate-500 mr-2">金額</label>
                                <RowAmount control={control} index={index} />
                            </div>

                            {/* 削除 */}
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => fields.length > 1 && remove(index)}
                                    disabled={fields.length <= 1}
                                    className="p-1.5 rounded-md text-slate-600 hover:text-red-400 hover:bg-red-500/10
                    disabled:opacity-20 disabled:cursor-not-allowed transition-all
                    opacity-0 group-hover:opacity-100 focus:opacity-100"
                                    title="行を削除"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* 行追加ボタン */}
                <button
                    type="button"
                    onClick={() => fields.length < MAX_ROWS && append(emptyRow())}
                    disabled={fields.length >= MAX_ROWS}
                    className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
            border border-dashed border-white/10 text-slate-400 text-sm
            hover:border-indigo-500/30 hover:text-indigo-300 hover:bg-indigo-500/5
            disabled:opacity-30 disabled:cursor-not-allowed
            transition-all"
                >
                    <Plus className="w-4 h-4" />
                    行を追加 ({fields.length}/{MAX_ROWS})
                </button>
            </div>

            {/* ═══ 総合計 ═══ */}
            <GrandTotal control={control} />

            {/* ═══ 送信 ═══ */}
            <div className="flex justify-end gap-3">
                <a
                    href="/dashboard"
                    className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-sm font-medium
            hover:bg-white/10 hover:text-white transition-all"
                >
                    キャンセル
                </a>
                <button
                    type="submit"
                    className="flex items-center gap-2 px-8 py-3 rounded-xl
            bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-sm
            hover:from-indigo-600 hover:to-purple-700 active:scale-[0.98]
            transition-all duration-200 ease-out
            shadow-lg shadow-indigo-500/25"
                >
                    <Send className="w-4 h-4" />
                    申請を送信
                </button>
            </div>

            {/* 送信成功モック */}
            {submitted && (
                <div className="fixed bottom-6 right-6 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 px-6 py-3 rounded-xl text-sm font-medium shadow-2xl animate-[fadeIn_0.3s_ease-out]">
                    ✅ 申請データがコンソールに出力されました（モック）
                </div>
            )}
        </form>
    );
}
