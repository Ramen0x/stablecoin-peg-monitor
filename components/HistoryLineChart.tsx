"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

interface TimeSeriesData { timestamp: number; [symbol: string]: number; }
interface HistoryLineChartProps { data: TimeSeriesData[]; symbols: string[]; }
interface PayloadEntry { name: string; value: number; color: string; }
interface TooltipProps { active?: boolean; payload?: PayloadEntry[]; label?: number; }

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316", "#84cc16", "#6366f1", "#14b8a6", "#d946ef", "#64748b", "#78716c", "#a3e635"];

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload && payload.length && label) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 shadow-lg max-h-[300px] overflow-y-auto">
        <p className="text-zinc-400 text-xs mb-2">{format(new Date(label * 1000), "MMM d, yyyy HH:mm")}</p>
        <div className="space-y-1">
          {[...payload].sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).map((entry) => (
            <div key={entry.name} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-zinc-300 text-sm">{entry.name}</span>
              </div>
              <span className="text-sm font-mono" style={{ color: Math.abs(entry.value) <= 5 ? "#22c55e" : Math.abs(entry.value) <= 25 ? "#eab308" : "#ef4444" }}>
                {entry.value >= 0 ? "+" : ""}{entry.value.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export default function HistoryLineChart({ data, symbols }: HistoryLineChartProps) {
  if (!data || data.length === 0) return <div className="w-full h-[400px] flex items-center justify-center text-zinc-500">No historical data available</div>;
  const allValues = data.flatMap((d) => symbols.map((s) => d[s]).filter((v) => v !== undefined));
  const maxAbs = Math.max(...allValues.map(Math.abs), 10);
  const yDomain = [-maxAbs * 1.1, maxAbs * 1.1];
  const formatXAxis = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    if (diffHours < 24) return format(date, "HH:mm");
    if (diffHours < 24 * 7) return format(date, "EEE HH:mm");
    return format(date, "MMM d");
  };
  return (
    <div className="w-full h-[500px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <XAxis dataKey="timestamp" tick={{ fill: "#a1a1aa", fontSize: 11 }} tickLine={{ stroke: "#52525b" }} axisLine={{ stroke: "#52525b" }} tickFormatter={formatXAxis} minTickGap={50} />
          <YAxis domain={yDomain} tick={{ fill: "#a1a1aa", fontSize: 11 }} tickLine={{ stroke: "#52525b" }} axisLine={{ stroke: "#52525b" }} tickFormatter={(value) => `${value > 0 ? "+" : ""}${value}`} label={{ value: "Deviation (bps)", angle: -90, position: "insideLeft", fill: "#71717a", fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: 20 }} formatter={(value) => <span className="text-zinc-300 text-sm">{value}</span>} />
          <ReferenceLine y={0} stroke="#71717a" strokeDasharray="3 3" />
          <ReferenceLine y={5} stroke="#22c55e" strokeOpacity={0.2} />
          <ReferenceLine y={-5} stroke="#22c55e" strokeOpacity={0.2} />
          <ReferenceLine y={25} stroke="#eab308" strokeOpacity={0.2} />
          <ReferenceLine y={-25} stroke="#eab308" strokeOpacity={0.2} />
          {symbols.map((symbol, index) => (<Line key={symbol} type="monotone" dataKey={symbol} stroke={COLORS[index % COLORS.length]} strokeWidth={2} dot={false} connectNulls />))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
