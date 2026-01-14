"use client";
interface Stablecoin { symbol: string; name: string; }
interface StablecoinSelectorProps { selected: string[]; onChange: (selected: string[]) => void; stablecoins: Stablecoin[]; }
export default function StablecoinSelector({ selected, onChange, stablecoins }: StablecoinSelectorProps) {
  const toggleCoin = (symbol: string) => {
    if (selected.includes(symbol)) onChange(selected.filter((s) => s !== symbol));
    else onChange([...selected, symbol]);
  };
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Stablecoins</span>
        <div className="flex gap-2">
          <button onClick={() => onChange(stablecoins.map((s) => s.symbol))} className="text-xs text-blue-600 dark:text-blue-500 hover:text-blue-500 dark:hover:text-blue-400">Select All</button>
          <span className="text-zinc-400 dark:text-zinc-600">|</span>
          <button onClick={() => onChange([])} className="text-xs text-blue-600 dark:text-blue-500 hover:text-blue-500 dark:hover:text-blue-400">Clear</button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {stablecoins.map((coin) => (
          <label key={coin.symbol} className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${selected.includes(coin.symbol) ? "bg-blue-50 dark:bg-zinc-800 border border-blue-500/50 dark:border-blue-600/50" : "bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"}`}>
            <input type="checkbox" checked={selected.includes(coin.symbol)} onChange={() => toggleCoin(coin.symbol)} className="w-4 h-4 rounded border-zinc-400 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-blue-600 focus:ring-blue-500" />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{coin.symbol}</span>
              <span className="text-xs text-zinc-500 truncate max-w-[80px]">{coin.name}</span>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
