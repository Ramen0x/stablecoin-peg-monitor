"use client";
interface TimeframeSelectorProps { value: string; onChange: (value: string) => void; }
const TIMEFRAMES = ["24h", "7d", "30d", "90d", "All"];
export default function TimeframeSelector({ value, onChange }: TimeframeSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-zinc-400 mr-2">Timeframe:</span>
      <div className="flex items-center bg-zinc-900 rounded-lg p-1 border border-zinc-800">
        {TIMEFRAMES.map((tf) => (
          <button key={tf} onClick={() => onChange(tf)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${value === tf ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-zinc-100"}`}>
            {tf}
          </button>
        ))}
      </div>
    </div>
  );
}
