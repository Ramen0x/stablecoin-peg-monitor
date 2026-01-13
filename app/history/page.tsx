"use client";

import { useState, useEffect, useCallback } from "react";
import TimeframeSelector from "@/components/TimeframeSelector";
import StablecoinSelector from "@/components/StablecoinSelector";
import HistoryLineChart from "@/components/HistoryLineChart";
import { STABLECOINS } from "@/lib/constants";

interface TimeSeriesData {
  timestamp: number;
  [symbol: string]: number;
}

interface ApiResponse {
  success: boolean;
  timeframe: string;
  symbols: string[];
  timeSeries: TimeSeriesData[];
  dataPoints: number;
  error?: string;
}

export default function HistoryPage() {
  const [timeframe, setTimeframe] = useState("24h");
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(
    STABLECOINS.slice(0, 6).map((s) => s.symbol)
  );
  const [data, setData] = useState<TimeSeriesData[]>([]);
  const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (selectedSymbols.length === 0) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const symbolsParam = selectedSymbols.join(",");
      const response = await fetch(
        `/api/history?symbols=${symbolsParam}&timeframe=${timeframe}`
      );
      const result: ApiResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch history");
      }

      setData(result.timeSeries);
      setAvailableSymbols(result.symbols);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [selectedSymbols, timeframe]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const stablecoinsForSelector = STABLECOINS.map((s) => ({
    symbol: s.symbol,
    name: s.name,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Historical Data</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Track stablecoin peg deviations over time
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-shrink-0">
          <TimeframeSelector value={timeframe} onChange={setTimeframe} />
        </div>
      </div>

      <StablecoinSelector
        selected={selectedSymbols}
        onChange={setSelectedSymbols}
        stablecoins={stablecoinsForSelector}
      />

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-100">
            Deviation History (basis points)
          </h2>
          {data.length > 0 && (
            <span className="text-sm text-zinc-500">
              {data.length} data points
            </span>
          )}
        </div>

        {loading ? (
          <div className="h-[500px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-zinc-400 text-sm">Loading history...</span>
            </div>
          </div>
        ) : error ? (
          <div className="h-[500px] flex items-center justify-center">
            <div className="text-center">
              <p className="text-red-400 mb-2">Error loading data</p>
              <p className="text-zinc-500 text-sm">{error}</p>
              <button
                onClick={fetchHistory}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        ) : selectedSymbols.length === 0 ? (
          <div className="h-[500px] flex items-center justify-center">
            <p className="text-zinc-500">
              Select at least one stablecoin to view history
            </p>
          </div>
        ) : data.length === 0 ? (
          <div className="h-[500px] flex items-center justify-center">
            <div className="text-center">
              <p className="text-zinc-400 mb-2">No historical data yet</p>
              <p className="text-zinc-500 text-sm">
                Data will appear once the cron job starts collecting prices
              </p>
            </div>
          </div>
        ) : (
          <HistoryLineChart
            data={data}
            symbols={selectedSymbols.filter((s) => availableSymbols.includes(s))}
          />
        )}
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-zinc-300 mb-2">
          About Historical Data
        </h3>
        <ul className="text-sm text-zinc-500 space-y-1">
          <li>Data is collected every 5 minutes from DeFiLlama</li>
          <li>Historical data starts from when the monitor was first deployed</li>
          <li>Reference lines show stable (+/-5 bps) and warning (+/-25 bps) thresholds</li>
        </ul>
      </div>
    </div>
  );
}
