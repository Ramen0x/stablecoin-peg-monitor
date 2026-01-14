"use client";

interface BaseAssetToggleProps {
  value: string;
  onChange: (value: string) => void;
}

const BASE_OPTIONS = ["USDT", "USDC"];

export default function BaseAssetToggle({ value, onChange }: BaseAssetToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-zinc-600 dark:text-zinc-400 mr-2">Base:</span>
      <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 rounded-lg p-1 border border-zinc-200 dark:border-zinc-800 transition-colors">
        {BASE_OPTIONS.map((option) => (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              value === option ? "bg-blue-600 text-white" : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
