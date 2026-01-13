"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from "recharts";
import { getBarColor, formatBps } from "@/lib/utils";

interface PriceData { symbol: string; deviationBps: number; }
interface PegBarChartProps { data: PriceData[]; }
interface TooltipProps { active?: boolean; payload?: Array<{ payload: PriceData }>; }

const CustomTooltip = ({ active, payload }: TooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 shadow-lg">
        <p className="text-zinc-100 font-medium">{data.symbol}</p>
        <p className="text-sm" style={{ color: getBarColor(data.deviationBps) }}>{formatBps(data.deviationBps)}</p>
      </div>
    );
  }
  return null;
};

export default function PegBarChart({ data }: PegBarChartProps) {
  const sortedData = [...data].sort((a, b) => Math.abs(b.deviationBps) - Math.abs(a.deviationBps));
  const maxDeviation = Math.max(...data.map((d) => Math.abs(d.deviationBps)), 10);
  const domain = [-maxDeviation * 1.2, maxDeviation * 1.2];
  return (
    <div className="w-full h-[500px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={sortedData} layout="vertical" margin={{ top: 20, right: 30, left: 60, bottom: 20 }}>
          <XAxis type="number" domain={domain} tick={{ fill: "#a1a1aa", fontSize: 12 }} tickLine={{ stroke: "#52525b" }} axisLine={{ stroke: "#52525b" }} tickFormatter={(value) => `${value > 0 ? "+" : ""}${value}`} />
          <YAxis type="category" dataKey="symbol" tick={{ fill: "#e4e4e7", fontSize: 12, fontWeight: 500 }} tickLine={false} axisLine={{ stroke: "#52525b" }} width={50} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
          <ReferenceLine x={0} stroke="#71717a" strokeDasharray="3 3" />
          <ReferenceLine x={5} stroke="#22c55e" strokeOpacity={0.3} />
          <ReferenceLine x={-5} stroke="#22c55e" strokeOpacity={0.3} />
          <ReferenceLine x={25} stroke="#eab308" strokeOpacity={0.3} />
          <ReferenceLine x={-25} stroke="#eab308" strokeOpacity={0.3} />
          <Bar dataKey="deviationBps" radius={[0, 4, 4, 0]}>
            {sortedData.map((entry, index) => (<Cell key={`cell-${index}`} fill={getBarColor(entry.deviationBps)} />))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
