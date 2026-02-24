"use client";

import { useState, useMemo } from "react";
import { Wallet, Search, ChevronDown } from "lucide-react";
import Link from "next/link";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export interface ClubCardData {
    id: string;
    name: string;
    total_budget: number;
    spent: number;
}

interface DonutSlice {
    name: string;
    value: number;
}

const FMT = new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
});

function formatAmount(n: number): string {
    return FMT.format(n);
}

export default function AdminClubCards({
    clubs,
}: {
    clubs: ClubCardData[];
}) {
    const [search, setSearch] = useState("");
    const [open, setOpen] = useState(false);

    const filtered = useMemo(() => {
        if (!search.trim()) return clubs;
        const kw = (search ?? "").toLowerCase();
        return clubs.filter((c) => (c?.name ?? "").toLowerCase().includes(kw));
    }, [clubs, search]);

    return (
        <section className="mb-10">
            {/* 上部: 部活動検索（選択で個別分析へ） */}
            <div className="mb-6">
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                    <Search className="w-3.5 h-3.5 inline mr-1.5" />
                    部活動を検索・選択
                </label>
                <div className="relative max-w-md">
                    <div className="relative">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setOpen(true);
                            }}
                            onFocus={() => setOpen(true)}
                            placeholder="部活動名で検索..."
                            className="w-full pl-4 pr-10 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500
                                focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
                        />
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none" />
                    </div>
                    {open && (
                        <>
                            <div
                                className="fixed inset-0 z-10"
                                aria-hidden
                                onClick={() => setOpen(false)}
                            />
                            <div className="absolute top-full left-0 right-0 mt-1 rounded-xl bg-slate-800/95 border border-white/10 shadow-xl z-20 max-h-60 overflow-auto">
                                {filtered.length === 0 ? (
                                    <p className="px-4 py-3 text-slate-500 text-sm">該当なし</p>
                                ) : (
                                    filtered.map((club) => (
                                        <Link
                                            key={club.id}
                                            href={`/admin/clubs/${club.id}`}
                                            className="block px-4 py-3 text-white hover:bg-white/10 border-b border-white/5 last:border-0 transition-colors"
                                            onClick={() => setOpen(false)}
                                        >
                                            <span className="font-medium">{club.name}</span>
                                            <span className="ml-2 text-xs text-slate-400 tabular-nums">
                                                {formatAmount(club?.spent ?? 0)} / {formatAmount(club?.total_budget ?? 0)}
                                            </span>
                                        </Link>
                                    ))
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* カード型グリッド */}
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-indigo-400" />
                部活動別予算概要
            </h2>

            {clubs.length === 0 ? (
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center">
                    <p className="text-slate-400 text-sm">登録されている部活動はありません</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {clubs.map((club) => {
                        const budget = Number(club?.total_budget ?? 0);
                        const spent = Number(club?.spent ?? 0);
                        const remaining = budget - spent;
                        const isOver = remaining < 0;
                        const pctSafe = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;

                        const donutData: DonutSlice[] =
                            budget <= 0
                                ? [{ name: "予算なし", value: 1 }]
                                : [
                                      { name: "支出", value: Math.min(spent, budget) },
                                      { name: "残額", value: Math.max(0, budget - spent) },
                                  ];

                        const centerSpent = spent;
                        const centerBudget = budget;

                        return (
                            <Link
                                key={club?.id ?? ""}
                                href={`/admin/clubs/${club?.id ?? ""}`}
                                className="block bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6
                                    hover:border-indigo-500/30 hover:bg-white/[0.07] transition-all group"
                            >
                                <h3 className="text-base font-semibold text-white mb-4 truncate group-hover:text-indigo-200 transition-colors">
                                    {club?.name ?? ""}
                                </h3>
                                <div className="flex flex-col sm:flex-row gap-4 items-center">
                                    <div className="relative w-full max-w-[160px] h-[160px] flex-shrink-0">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={donutData}
                                                    dataKey="value"
                                                    nameKey="name"
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={44}
                                                    outerRadius={64}
                                                    paddingAngle={0}
                                                    isAnimationActive={true}
                                                >
                                                    {donutData.map((_, i) => (
                                                        <Cell
                                                            key={i}
                                                            fill={i === 0 ? "#ec4899" : "#334155"}
                                                            stroke="rgba(255,255,255,0.06)"
                                                            strokeWidth={1}
                                                        />
                                                    ))}
                                                </Pie>
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                            <span className="text-xs text-slate-400">支出 / 予算</span>
                                            <span className="text-sm font-bold text-white tabular-nums text-center leading-tight">
                                                {formatAmount(centerSpent)}
                                            </span>
                                            <span className="text-xs text-slate-500">/</span>
                                            <span className="text-sm font-semibold text-slate-300 tabular-nums text-center">
                                                {formatAmount(centerBudget)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex-1 w-full space-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">初期予算</span>
                                            <span className="text-slate-300 tabular-nums">{formatAmount(budget)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">使用額</span>
                                            <span className="text-pink-300 tabular-nums">{formatAmount(spent)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">残額</span>
                                            <span className={`font-semibold tabular-nums ${isOver ? "text-red-400" : "text-emerald-300"}`}>
                                                {formatAmount(remaining)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-xs text-slate-500 pt-1">
                                            <span>消化率</span>
                                            <span>{pctSafe.toFixed(0)}%</span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
