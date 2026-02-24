"use client";

import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { Plus, Trash2, Send, Calculator, Upload, FileText, X, Loader2 } from "lucide-react";
import { useState, useRef } from "react";
import { updateRequestAndResubmit } from "./actions";

interface ItemRow {
    item_name: string;
    quantity: number;
    unit_price: number;
}

interface FormData {
    date: string;
    job_title: string;
    applicant_name: string;
    category: string;
    reason: string;
    payee: string;
    items: ItemRow[];
}

const MAX_ROWS = 30;

function emptyRow(): ItemRow {
    return { item_name: "", quantity: 1, unit_price: 0 };
}

function GrandTotal({ control }: { control: ReturnType<typeof useForm<FormData>>["control"] }) {
    const items = useWatch({ control, name: "items" });
    const total = (items ?? []).reduce(
        (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
        0
    );
    const fmt = new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 });
    return (
        <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-xl" />
            <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-8 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                    <Calculator className="w-5 h-5 text-indigo-400" />
                    <span className="text-sm font-medium text-slate-400 uppercase tracking-wider">総合計金額</span>
                </div>
                <p className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">{fmt.format(total)}</p>
            </div>
        </div>
    );
}

function RowAmount({ control, index }: { control: ReturnType<typeof useForm<FormData>>["control"]; index: number }) {
    const quantity = useWatch({ control, name: `items.${index}.quantity` });
    const unitPrice = useWatch({ control, name: `items.${index}.unit_price` });
    const amount = (Number(quantity) || 0) * (Number(unitPrice) || 0);
    const fmt = new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 });
    return (
        <span className={`text-sm font-semibold tabular-nums ${amount > 0 ? "text-white" : "text-slate-600"}`}>
            {fmt.format(amount)}
        </span>
    );
}

export default function EditRequestForm({
    requestId,
    defaultValues,
}: {
    requestId: string;
    defaultValues: FormData;
}) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { register, control, handleSubmit } = useForm<FormData>({
        defaultValues,
    });

    const { fields, append, remove } = useFieldArray({ control, name: "items" });

    const onSubmit = async (data: FormData) => {
        setIsSubmitting(true);
        setError(null);
        try {
            const fd = new FormData();
            fd.append("date", data.date);
            fd.append("job_title", data.job_title);
            fd.append("applicant_name", data.applicant_name);
            fd.append("category", data.category);
            fd.append("reason", data.reason);
            fd.append("payee", data.payee);
            fd.append("items", JSON.stringify(data.items));
            if (receiptFile) fd.append("receipt", receiptFile);
            const result = await updateRequestAndResubmit(requestId, fd);
            if (result?.error) {
                setError(result.error);
                setIsSubmitting(false);
            }
        } catch {
            setError("送信中にエラーが発生しました。もう一度お試しください。");
            setIsSubmitting(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };
    const handleDragLeave = () => setIsDragging(false);
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && ["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(file.type)) {
            setReceiptFile(file);
        }
    };
    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const inputClass =
        "w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all";
    const labelClass = "block text-xs font-medium text-slate-400 mb-1.5";

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-5 py-4 flex items-start gap-3">
                    <span className="text-red-400 text-lg mt-0.5">⚠</span>
                    <p className="text-red-300 text-sm font-medium flex-1">{error}</p>
                    <button type="button" onClick={() => setError(null)} className="text-red-400/60 hover:text-red-300">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-5">申請情報</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className={labelClass}>記載日</label>
                        <input type="date" {...register("date", { required: true })} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>職名</label>
                        <input type="text" {...register("job_title", { required: true })} placeholder="例: 事務担当" className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>申請者氏名</label>
                        <input type="text" {...register("applicant_name", { required: true })} placeholder="例: 田中 太郎" className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>科目</label>
                        <input type="text" {...register("category")} placeholder="例: 備品購入" className={inputClass} />
                    </div>
                    <div className="md:col-span-2">
                        <label className={labelClass}>事由</label>
                        <input type="text" {...register("reason")} placeholder="例: 大会出場に伴うユニフォーム購入" className={inputClass} />
                    </div>
                    <div className="md:col-span-3">
                        <label className={labelClass}>支払先</label>
                        <input type="text" {...register("payee")} placeholder="例: 株式会社○○スポーツ" className={inputClass} />
                    </div>
                </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-indigo-400" />
                    領収書（変更する場合のみ選択）
                </h2>
                {!receiptFile ? (
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all ${isDragging ? "border-indigo-500 bg-indigo-500/10" : "border-white/10 hover:border-indigo-500/30 hover:bg-indigo-500/5"}`}
                    >
                        <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragging ? "text-indigo-400" : "text-slate-500"}`} />
                        <p className="text-sm text-slate-400 mb-1">クリックまたはドラッグでファイルを選択（省略時は既存のまま）</p>
                        <p className="text-xs text-slate-600">PDF / JPG / PNG / WebP</p>
                        <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(e) => e.target.files?.[0] && setReceiptFile(e.target.files[0])} className="hidden" />
                    </div>
                ) : (
                    <div className="flex items-center gap-4 rounded-xl bg-white/[0.03] border border-white/10 p-4">
                        <div className="p-3 rounded-lg bg-indigo-500/10">
                            <FileText className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-white font-medium truncate">{receiptFile.name}</p>
                            <p className="text-xs text-slate-500">{formatFileSize(receiptFile.size)}</p>
                        </div>
                        <button type="button" onClick={() => { setReceiptFile(null); fileInputRef.current && (fileInputRef.current.value = ""); }} className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-semibold text-white">明細</h2>
                    <span className="text-xs text-slate-500">{fields.length} / {MAX_ROWS} 行</span>
                </div>
                <div className="hidden md:grid md:grid-cols-[1fr_100px_120px_100px_40px] gap-3 mb-2 px-1">
                    <span className="text-xs font-medium text-slate-500">項目・品名</span>
                    <span className="text-xs font-medium text-slate-500">数量</span>
                    <span className="text-xs font-medium text-slate-500">単価</span>
                    <span className="text-xs font-medium text-slate-500 text-right">金額</span>
                    <span />
                </div>
                <div className="space-y-2">
                    {fields.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-1 md:grid-cols-[1fr_100px_120px_100px_40px] gap-2 md:gap-3 items-center bg-white/[0.02] rounded-lg p-2 md:p-1 border border-white/5 hover:border-white/10 group">
                            <div>
                                <label className="md:hidden text-xs text-slate-500 mb-1 block">品名</label>
                                <input type="text" {...register(`items.${index}.item_name`)} placeholder={`品名 ${index + 1}`} className={inputClass} />
                            </div>
                            <div>
                                <label className="md:hidden text-xs text-slate-500 mb-1 block">数量</label>
                                <input type="number" min={0} {...register(`items.${index}.quantity`, { valueAsNumber: true })} className={`${inputClass} text-center tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`} />
                            </div>
                            <div>
                                <label className="md:hidden text-xs text-slate-500 mb-1 block">単価</label>
                                <input type="number" min={0} {...register(`items.${index}.unit_price`, { valueAsNumber: true })} placeholder="¥" className={`${inputClass} text-right tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`} />
                            </div>
                            <div className="flex items-center justify-end">
                                <label className="md:hidden text-xs text-slate-500 mr-2">金額</label>
                                <RowAmount control={control} index={index} />
                            </div>
                            <div className="flex justify-end">
                                <button type="button" onClick={() => fields.length > 1 && remove(index)} disabled={fields.length <= 1} className="p-1.5 rounded-md text-slate-600 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-20 opacity-0 group-hover:opacity-100 focus:opacity-100" title="行を削除">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                <button type="button" onClick={() => fields.length < MAX_ROWS && append(emptyRow())} disabled={fields.length >= MAX_ROWS} className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-white/10 text-slate-400 text-sm hover:border-indigo-500/30 hover:text-indigo-300 hover:bg-indigo-500/5 disabled:opacity-30">
                    <Plus className="w-4 h-4" /> 行を追加 ({fields.length}/{MAX_ROWS})
                </button>
            </div>

            <GrandTotal control={control} />

            <div className="flex justify-end gap-3">
                <a href={`/admin/${requestId}`} className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-sm font-medium hover:bg-white/10 hover:text-white transition-all">
                    キャンセル
                </a>
                <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold text-sm hover:from-amber-600 hover:to-orange-700 active:scale-[0.98] transition-all shadow-lg shadow-amber-500/25 disabled:opacity-60 disabled:cursor-not-allowed">
                    {isSubmitting ? (<><Loader2 className="w-4 h-4 animate-spin" /> 送信中...</>) : (<><Send className="w-4 h-4" /> 修正して再提出</>)}
                </button>
            </div>
        </form>
    );
}
