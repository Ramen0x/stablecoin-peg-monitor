"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, Cell, Label } from "recharts";
import { getBarColor, formatBps } from "@/lib/utils";
import { useTheme } from "./ThemeProvider";

interface PriceData {
  symbol: string;
  name?: string;
  price?: number | null;
  deviationBps: number | null;
}

interface PegBarChartProps {
  data: PriceData[];
  size?: string;
  base?: string;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: PriceData & { deviationBps: number } }>;
  size?: string;
  base?: string;
}

const CustomTooltip = ({ active, payload, size, base }: TooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const deviation = data.deviationBps;
    const isPositive = deviation > 0;
    const sizeNum = size ? parseFloat(size.replace("M", "")) * 1_000_000 : 1_000_000;
    const youGet = data.price ? (sizeNum * data.price).toLocaleString("en-US", { maximumFractionDigits: 0 }) : null;
    
    return (
      <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 shadow-xl min-w-[220px]">
        <div className="flex items-center gap-2 mb-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: getBarColor(deviation) }}
          />
          <span className="text-zinc-900 dark:text-zinc-100 font-semibold text-base">{data.symbol}</span>
          {data.name && <span className="text-zinc-500 text-xs">({data.name})</span>}
        </div>
        
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-zinc-500 text-sm">Swap:</span>
            <span className="font-mono text-zinc-700 dark:text-zinc-300 text-sm">
              ${size} {base || "USDT"}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-zinc-500 text-sm">Deviation:</span>
            <span className="font-mono font-medium" style={{ color: getBarColor(deviation) }}>
              {formatBps(deviation)}
            </span>
          </div>
          
          {youGet && (
            <div className="flex justify-between items-center">
              <span className="text-zinc-500 text-sm">You get:</span>
              <span className="font-mono text-zinc-700 dark:text-zinc-300 text-sm">
                {youGet} {data.symbol}
              </span>
            </div>
          )}
          
          <div className="pt-2 mt-2 border-t border-zinc-200 dark:border-zinc-700">
            <span className={`text-xs ${isPositive ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
              {isPositive 
                ? "Trading at premium - you receive less" 
                : deviation < 0 
                  ? "Trading at discount - you receive more"
                  : "Perfect peg - 1:1 exchange"
              }
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function PegBarChart({ data, size = "1M", base = "USDT" }: PegBarChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  
  // Filter out items with null deviationBps for the chart
  const validData = data.filter((d): d is PriceData & { deviationBps: number } => d.deviationBps !== null);
  
  if (validData.length === 0) {
    return (
      <div className="w-full h-[500px] flex items-center justify-center">
        <p className="text-zinc-500">No price data available</p>
      </div>
    );
  }

  const sortedData = [...validData].sort((a, b) => Math.abs(b.deviationBps) - Math.abs(a.deviationBps));
  const maxDeviation = Math.max(...validData.map((d) => Math.abs(d.deviationBps)), 10);
  const domain = [-maxDeviation * 1.2, maxDeviation * 1.2];
  
  // Theme-aware colors
  const textColor = isDark ? "#a1a1aa" : "#71717a";
  const axisColor = isDark ? "#52525b" : "#d4d4d8";
  const labelColor = isDark ? "#e4e4e7" : "#27272a";
  const gridColor = isDark ? "#27272a" : "#e4e4e7";

  return (
    <div className="w-full h-[500px]">
      {/* Axis labels above chart */}
      <div className="flex justify-between px-16 mb-3 text-xs font-medium">
        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
          </svg>
          You get MORE (discount)
        </span>
        <span className="text-zinc-500 dark:text-zinc-400">Deviation in Basis Points</span>
        <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
          You get LESS (premium)
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
          </svg>
        </span>
      </div>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart 
          data={sortedData} 
          layout="vertical" 
          margin={{ top: 10, right: 30, left: 70, bottom: 30 }}
        >
          <defs>
            {/* Gradient definitions for bars */}
            <linearGradient id="greenGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#22c55e" stopOpacity={1} />
            </linearGradient>
            <linearGradient id="yellowGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#eab308" stopOpacity={1} />
            </linearGradient>
            <linearGradient id="redGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#f87171" stopOpacity={1} />
            </linearGradient>
          </defs>
          
          <XAxis
            type="number"
            domain={domain}
            tick={{ fill: textColor, fontSize: 12 }}
            tickLine={{ stroke: axisColor }}
            axisLine={{ stroke: axisColor }}
            tickFormatter={(value) => `${value > 0 ? "+" : ""}${value}`}
          >
            <Label 
              value={`Swapping $${size} ${base}`} 
              position="bottom" 
              offset={10} 
              fill={textColor} 
              fontSize={11} 
            />
          </XAxis>
          <YAxis
            type="category"
            dataKey="symbol"
            tick={{ fill: labelColor, fontSize: 13, fontWeight: 600 }}
            tickLine={false}
            axisLine={{ stroke: axisColor }}
            width={60}
          />
          <Tooltip 
            content={<CustomTooltip size={size} base={base} />} 
            cursor={{ fill: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" }}
            wrapperStyle={{ outline: "none" }}
          />
          
          {/* Reference lines with labels */}
          <ReferenceLine x={0} stroke={gridColor} strokeWidth={2} />
          <ReferenceLine x={5} stroke="#22c55e" strokeOpacity={0.4} strokeDasharray="4 4" />
          <ReferenceLine x={-5} stroke="#22c55e" strokeOpacity={0.4} strokeDasharray="4 4" />
          <ReferenceLine x={25} stroke="#eab308" strokeOpacity={0.4} strokeDasharray="4 4" />
          <ReferenceLine x={-25} stroke="#eab308" strokeOpacity={0.4} strokeDasharray="4 4" />
          
          <Bar 
            dataKey="deviationBps" 
            radius={[0, 6, 6, 0]}
            animationDuration={800}
            animationEasing="ease-out"
          >
            {sortedData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={getBarColor(entry.deviationBps)}
                style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.1))" }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
