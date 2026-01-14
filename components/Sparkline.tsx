"use client";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
}

export default function Sparkline({ 
  data, 
  color = "#3b82f6", 
  height = 32,
  width = 80 
}: SparklineProps) {
  if (!data || data.length < 2) {
    return (
      <div 
        className="flex items-center justify-center text-zinc-400 text-xs"
        style={{ width, height }}
      >
        --
      </div>
    );
  }

  const chartData = data.map((value, index) => ({ value, index }));
  const min = Math.min(...data);
  const max = Math.max(...data);
  const padding = (max - min) * 0.1 || 1;

  // Determine trend color based on first vs last value
  const trend = data[data.length - 1] - data[0];
  const trendColor = Math.abs(trend) < 1 ? "#22c55e" : trend > 0 ? "#ef4444" : "#22c55e";
  const finalColor = color === "auto" ? trendColor : color;

  return (
    <div style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <YAxis domain={[min - padding, max + padding]} hide />
          <Line
            type="monotone"
            dataKey="value"
            stroke={finalColor}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
