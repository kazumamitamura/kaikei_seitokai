"use client";

import type { ReactNode } from "react";
import {
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";

const CHART_COLORS: string[] = [
    "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
    "#f43f5e", "#f97316", "#eab308", "#22c55e", "#14b8a6",
];

export interface CategorySlice {
    name: string;
    value: number;
}

export interface MonthlyBar {
    month: string;
    amount: number;
    count: number;
}

/** Recharts Pie label のペイロード（percent は undefined の可能性あり） */
interface PieLabelPayload {
    name?: string;
    percent?: number;
}

export default function ClubCharts({
    categoryData,
    monthlyData,
}: {
    categoryData: CategorySlice[];
    monthlyData: MonthlyBar[];
}) {
    const fmt = (n: number) =>
        new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(n);

    const safePieLabel = (payload: PieLabelPayload): string => {
        const name = payload?.name ?? "";
        const percent = payload?.percent;
        const pct = percent != null ? (percent * 100).toFixed(0) : "0";
        return `${name} ${pct}%`;
    };

    const tooltipValueFmt = (value: number | undefined): [string, string] => {
        const n = value ?? 0;
        return [fmt(n), "金額"];
    };

    const barTooltipValueFmt = (value: number | undefined): [string, string] => {
        const n = value ?? 0;
        return [fmt(n), "支出"];
    };

    const yAxisTickFmt = (v: number | undefined): string => {
        const n = v ?? 0;
        return n >= 10000 ? `${n / 10000}万` : String(n);
    };

    const tooltipLabelFmt = (label: unknown): string => `年月: ${label != null ? String(label) : ""}`;

    const legendFmt = (name: unknown): ReactNode => (
        <span className="text-slate-300 text-sm">{name != null ? String(name) : ""}</span>
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 費目別 円グラフ */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <h3 className="text-base font-semibold text-white mb-4">費目別支出割合</h3>
                {categoryData.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-slate-500 text-sm">データがありません</div>
                ) : (
                    <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                            <Pie
                                data={categoryData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={2}
                                dataKey="value"
                                nameKey="name"
                                label={safePieLabel}
                                labelLine={{ stroke: "rgba(255,255,255,0.3)" }}
                            >
                                {categoryData.map((_, i) => (
                                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="rgba(0,0,0,0.1)" strokeWidth={1} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={tooltipValueFmt}
                                contentStyle={{ backgroundColor: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                                labelStyle={{ color: "#e2e8f0" }}
                            />
                            <Legend formatter={legendFmt} />
                        </PieChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* 月別 棒グラフ */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <h3 className="text-base font-semibold text-white mb-4">月別支出推移</h3>
                {monthlyData.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-slate-500 text-sm">データがありません</div>
                ) : (
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                            <XAxis
                                dataKey="month"
                                tick={{ fill: "#94a3b8", fontSize: 11 }}
                                axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                            />
                            <YAxis
                                tick={{ fill: "#94a3b8", fontSize: 11 }}
                                axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                                tickFormatter={yAxisTickFmt}
                            />
                            <Tooltip
                                formatter={barTooltipValueFmt}
                                contentStyle={{ backgroundColor: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                                labelStyle={{ color: "#e2e8f0" }}
                                labelFormatter={tooltipLabelFmt}
                            />
                            <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} name="支出" />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}
