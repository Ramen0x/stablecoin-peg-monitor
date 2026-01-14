"use client";

import { useState, useEffect, useCallback } from "react";
import BaseAssetToggle from "@/components/BaseAssetToggle";
import SizeSelector from "@/components/SizeSelector";
import PegBarChart from "@/components/PegBarChart";
import { formatBps, getRelativeTime, getBarColor } from "@/lib/utils";
import { REFRESH_INTERVAL, DEVIATION_THRESHOLDS, type TradeSize } from "@/lib/constants";

interface PricesBySize {
  [key: string]: {
    price: number;
    deviationBps: number;
    priceImpact: number | null;
  };
}

interface PriceData {
  id: string;
  symbol: string;
  name: string;
  price: number;
  deviationBps: number;
  pricesBySize?: PricesBySize;
}

interface ApiResponse {
  success: boolean;
  base: string;
  size: TradeSize;
  timestamp: number;
  prices: PriceData[];
  error?: string;
  source?: string;
}

export default function Dashboard() {
  const [base, setBase] = useState("USDT");
  const [size, setSize] = useState<TradeSize>("1M");
  const [prices, setPrices] = useState<PriceData[]>([]);
  const [timestamp, setTimestamp] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);

  const fetchPrices = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/prices?base=${base}&size=${size}&live=true`);
      const data: ApiResponse = await response.json();
      if (!data.success) throw new Error(data.error || "Failed to fetch prices");
      setPrices(data.prices);
      setTimestamp(data.timestamp);
      setSource(data.source || null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [base, size]);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  const stableCount = prices.filter((p) => Math.abs(p.deviationBps) <= DEVIATION_THRESHOLDS.STABLE).length;
  const warningCount = prices.filter(
    (p) => Math.abs(p.deviationBps) > DEVIATION_THRESHOLDS.STABLE && Math.abs(p.deviationBps) <= DEVIATION_THRESHOLDS.WARNING
  ).length;
  const criticalCount = prices.filter((p) => Math.abs(p.deviationBps) > DEVIATION_THRESHOLDS.WARNING).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Live Peg Status</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Real DEX quotes via 0x • Swap ${size} {base} to each stablecoin
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <SizeSelector value={size} onChange={setSize} />
          <BaseAssetToggle value={base} onChange={setBase} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 text-sm">Stable</span>
            <span className="text-green-500 text-2xl font-bold">{stableCount}</span>
          </div>
          <p className="text-zinc-500 text-xs mt-1">Within +/-5 bps</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 text-sm">Minor Deviation</span>
            <span className="text-yellow-500 text-2xl font-bold">{warningCount}</span>
          </div>
          <p className="text-zinc-500 text-xs mt-1">Within +/-25 bps</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 text-sm">Significant Deviation</span>
            <span className="text-red-500 text-2xl font-bold">{criticalCount}</span>
          </div>
          <p className="text-zinc-500 text-xs mt-1">Beyond +/-25 bps</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-100">Deviation from Peg (basis points)</h2>
          <div className="flex items-center gap-4">
            {source && <span className="text-xs text-zinc-600 bg-zinc-800 px-2 py-1 rounded">via {source}</span>}
            {timestamp && <span className="text-sm text-zinc-500">Updated {getRelativeTime(timestamp)}</span>}
          </div>
        </div>
        {loading ? (
          <div className="h-[500px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-zinc-400 text-sm">Fetching DEX quotes...</span>
            </div>
          </div>
        ) : error ? (
          <div className="h-[500px] flex items-center justify-center">
            <div className="text-center">
              <p className="text-red-400 mb-2">Error loading data</p>
              <p className="text-zinc-500 text-sm">{error}</p>
              <button onClick={fetchPrices} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Retry
              </button>
            </div>
          </div>
        ) : (
          <PegBarChart data={prices} />
        )}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-100">Detailed View</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50">
                <th className="text-left px-4 py-3 text-sm font-medium text-zinc-400">Symbol</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-zinc-400">Name</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-zinc-400">Price vs {base}</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-zinc-400">Deviation</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-zinc-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {prices
                .sort((a, b) => Math.abs(b.deviationBps) - Math.abs(a.deviationBps))
                .map((price) => (
                  <tr key={price.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="px-4 py-3 font-medium text-zinc-100">{price.symbol}</td>
                    <td className="px-4 py-3 text-zinc-400">{price.name}</td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-300">
                      {price.price?.toFixed(6) ?? "N/A"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono" style={{ color: getBarColor(price.deviationBps) }}>
                      {formatBps(price.deviationBps)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className="inline-block w-3 h-3 rounded-full"
                        style={{ backgroundColor: getBarColor(price.deviationBps) }}
                      />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-center gap-6 text-sm text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-500" />
          <span>Stable (+/-5 bps)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-yellow-500" />
          <span>Warning (+/-25 bps)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          <span>Critical (&gt;25 bps)</span>
        </div>
      </div>
    </div>
  );
}
