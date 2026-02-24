"use client";

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

const CHART_COLORS = [
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

export default function ClubCharts({
    categoryData,
    monthlyData,
}: {
    categoryData: CategorySlice[];
    monthlyData: MonthlyBar[];
}) {
    const fmt = (n: number) =>
        new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(n);

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
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                labelLine={{ stroke: "rgba(255,255,255,0.3)" }}
                            >
                                {categoryData.map((_, i) => (
                                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="rgba(0,0,0,0.1)" strokeWidth={1} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value: number) => [fmt(value), "金額"]}
                                contentStyle={{ backgroundColor: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                                labelStyle={{ color: "#e2e8f0" }}
                            />
                            <Legend formatter={(name) => <span className="text-slate-300 text-sm">{name}</span>} />
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
                                tickFormatter={(v) => (v >= 10000 ? `${v / 10000}万` : String(v))}
                            />
                            <Tooltip
                                formatter={(value: number) => [fmt(value), "支出"]}
                                contentStyle={{ backgroundColor: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                                labelStyle={{ color: "#e2e8f0" }}
                                labelFormatter={(label) => `年月: ${label}`}
                            />
                            <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} name="支出" />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}
