"use client";

import { TRADE_SIZES, type TradeSize } from "@/lib/constants";

interface SizeSelectorProps {
  value: TradeSize;
  onChange: (value: TradeSize) => void;
}

export default function SizeSelector({ value, onChange }: SizeSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-zinc-600 dark:text-zinc-400 mr-2">Trade Size:</span>
      <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 rounded-lg p-1 border border-zinc-200 dark:border-zinc-800 transition-colors">
        {TRADE_SIZES.map((size) => (
          <button
            key={size.label}
            onClick={() => onChange(size.label)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              value === size.label ? "bg-blue-600 text-white" : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            ${size.label}
          </button>
        ))}
      </div>
    </div>
  );
}
