import { NextRequest, NextResponse } from "next/server";
import { getHistoricalData, getAllHistoricalData, initializeDb } from "@/lib/db";
import { STABLECOINS, TIMEFRAMES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbolsParam = searchParams.get("symbols") || "all";
    const timeframe = searchParams.get("timeframe") || "24h";

    let stablecoinIds: string[];
    if (symbolsParam === "all") {
      stablecoinIds = STABLECOINS.map((s) => s.id);
    } else {
      const symbols = symbolsParam.split(",").map((s) => s.trim().toUpperCase());
      stablecoinIds = STABLECOINS.filter((s) => symbols.includes(s.symbol)).map((s) => s.id);
    }
    if (stablecoinIds.length === 0) {
      return NextResponse.json({ success: false, error: "No valid stablecoins specified" }, { status: 400 });
    }

    await initializeDb();
    const timeframeConfig = TIMEFRAMES.find((t) => t.label === timeframe);
    const hours = timeframeConfig?.hours ?? 24;

    const data = hours === -1
      ? await getAllHistoricalData(stablecoinIds)
      : await getHistoricalData(stablecoinIds, Math.floor(Date.now() / 1000) - hours * 3600);

    const groupedData: Record<string, Array<{ timestamp: number; price: number; deviationBps: number }>> = {};
    for (const row of data) {
      if (!groupedData[row.symbol]) groupedData[row.symbol] = [];
      groupedData[row.symbol].push({ timestamp: row.timestamp, price: row.price, deviationBps: row.deviation_bps });
    }

    const timeSeriesMap = new Map<number, Record<string, number>>();
    for (const row of data) {
      if (!timeSeriesMap.has(row.timestamp)) timeSeriesMap.set(row.timestamp, { timestamp: row.timestamp });
      timeSeriesMap.get(row.timestamp)![row.symbol] = row.deviation_bps;
    }
    const timeSeries = Array.from(timeSeriesMap.values()).sort((a, b) => a.timestamp - b.timestamp);

    return NextResponse.json({ success: true, timeframe, symbols: Object.keys(groupedData), bySymbol: groupedData, timeSeries, dataPoints: data.length });
  } catch (error) {
    console.error("History API error:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
