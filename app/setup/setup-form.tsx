"use client";

import { useActionState, useState } from "react";
import { setupClub } from "./actions";
import { Building2, Wallet, ArrowRight, User } from "lucide-react";

const NEW_CLUB_VALUE = "__new__";

interface Club {
    id: string;
    name: string;
}

export default function SetupForm({ clubs }: { clubs: Club[] }) {
    const [state, formAction, isPending] = useActionState(setupClub, {
        error: null,
    });
    const [clubSelect, setClubSelect] = useState("");

    const isNewClub = clubSelect === NEW_CLUB_VALUE;

    return (
        <form action={formAction} className="space-y-6">
            {/* Error */}
            {state.error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm text-center">
                    {state.error}
                </div>
            )}

            {/* 姓・名 (横並び) */}
            <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                    <User className="w-4 h-4 text-sky-400" />
                    氏名
                </label>
                <div className="grid grid-cols-2 gap-3">
                    <input
                        type="text"
                        name="last_name"
                        required
                        placeholder="姓（例: 田中）"
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white
              placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50
              focus:border-indigo-500/50 transition-all"
                    />
                    <input
                        type="text"
                        name="first_name"
                        required
                        placeholder="名（例: 太郎）"
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white
              placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50
              focus:border-indigo-500/50 transition-all"
                    />
                </div>
            </div>

            {/* 部活動（プルダウン選択） */}
            <div>
                <label
                    htmlFor="club_select"
                    className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2"
                >
                    <Building2 className="w-4 h-4 text-indigo-400" />
                    部活動
                </label>
                <select
                    id="club_select"
                    name="club_select"
                    required
                    value={clubSelect}
                    onChange={(e) => setClubSelect(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white
              focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50
              transition-all appearance-none cursor-pointer [&>option]:bg-slate-900"
                >
                    <option value="" className="bg-slate-900">選択してください</option>
                    {clubs.map((c) => (
                        <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>
                    ))}
                    <option value={NEW_CLUB_VALUE} className="bg-slate-900">新規登録（上記にない場合）</option>
                </select>
            </div>

            {/* 新規登録時のみ: 部活動名・初期予算 */}
            {isNewClub && (
                <>
                    <div>
                        <label
                            htmlFor="club_name"
                            className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2"
                        >
                            <Building2 className="w-4 h-4 text-indigo-400" />
                            新規 部活動名
                        </label>
                        <input
                            type="text"
                            id="club_name"
                            name="club_name"
                            required={isNewClub}
                            placeholder="例: サッカー部"
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white
                  placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50
                  focus:border-indigo-500/50 transition-all"
                        />
                    </div>
                    <div>
                        <label
                            htmlFor="total_budget"
                            className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2"
                        >
                            <Wallet className="w-4 h-4 text-emerald-400" />
                            今年度の初期予算（円）
                        </label>
                        <input
                            type="number"
                            id="total_budget"
                            name="total_budget"
                            required={isNewClub}
                            min={0}
                            placeholder="例: 500000"
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white
                  placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50
                  focus:border-indigo-500/50 transition-all
                  [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none
                  [&::-webkit-inner-spin-button]:appearance-none"
                        />
                    </div>
                </>
            )}

            {/* Submit */}
            <button
                type="submit"
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl
          bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-sm
          hover:from-indigo-600 hover:to-purple-700 active:scale-[0.98]
          transition-all duration-200 ease-out
          disabled:opacity-50 disabled:cursor-not-allowed
          shadow-lg shadow-indigo-500/25"
            >
                {isPending ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                    <>
                        登録してダッシュボードへ
                        <ArrowRight className="w-4 h-4" />
                    </>
                )}
            </button>
        </form>
    );
}
