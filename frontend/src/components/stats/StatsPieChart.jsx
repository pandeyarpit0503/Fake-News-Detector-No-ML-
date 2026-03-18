import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function StatsPieChart({ data = [] }) {
    const chartData = [
        { name: "Real", value: parseInt(data.real_count || 0), color: "#4A7C59" },
        { name: "Partially Correct", value: parseInt(data.partial_count || 0), color: "#C87941" },
        { name: "Fake / Misleading", value: parseInt(data.fake_count || 0), color: "#C43D26" },
        { name: "Unverified", value: parseInt(data.unverified_count || 0), color: "#8C8C8C" }
    ].filter(item => item.value > 0);

    const total = chartData.reduce((acc, curr) => acc + curr.value, 0);

    if (total === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[360px] text-[var(--brown-light)]">
                <span className="text-4xl mb-3">📊</span>
                <p className="font-lato">No data yet. Start analyzing news!</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center w-full fade-in-up" style={{ animationDelay: "0.2s" }}>
            <h3 className="font-playfair text-[1.2rem] font-bold text-[var(--brown)] mb-2">Verdict Distribution</h3>

            <div className="relative w-full h-[360px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={80}
                            outerRadius={130}
                            paddingAngle={4}
                            dataKey="value"
                            animationBegin={0}
                            animationDuration={1200}
                            animationEasing="ease-out"
                            stroke="none"
                            cornerRadius={6}
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={index} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                background: "var(--beige-100)",
                                border: "1px solid var(--beige-200)",
                                borderRadius: "8px",
                                fontFamily: "Lato",
                                fontWeight: "bold",
                                color: "var(--brown)",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
                            }}
                            itemStyle={{ color: "var(--coral-light)" }}
                        />
                        <Legend
                            iconType="circle"
                            iconSize={10}
                            formatter={(value) => (
                                <span style={{ color: "var(--brown-light)", fontFamily: "Lato", fontWeight: 600, marginLeft: "4px" }}>
                                    {value}
                                </span>
                            )}
                            wrapperStyle={{ paddingTop: "20px" }}
                        />
                    </PieChart>
                </ResponsiveContainer>

                {/* Center Text overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-[28px]">
                    <span className="text-4xl font-playfair font-bold text-[var(--brown)]">{total}</span>
                    <span className="text-xs font-lato text-[var(--brown-light)] uppercase tracking-widest mt-1">Total</span>
                </div>
            </div>
        </div>
    );
}
