import { NextRequest, NextResponse } from "next/server";
import { getLatestPrices, initializeDb, seedStablecoins } from "@/lib/db";
import { fetchStablecoinPrices, calculateRelativeDeviations } from "@/lib/aggregator";
import { STABLECOINS, BASE_ASSETS, TRADE_SIZES, type TradeSize } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const base = searchParams.get("base") || "USDT";
    const live = searchParams.get("live") === "true";
    const size = (searchParams.get("size") || "1M") as TradeSize;

    // Validate size parameter
    const validSize = TRADE_SIZES.find((s) => s.label === size);
    if (!validSize) {
      return NextResponse.json(
        { success: false, error: `Invalid size. Must be one of: ${TRADE_SIZES.map((s) => s.label).join(", ")}` },
        { status: 400 }
      );
    }

    // Validate base parameter
    const validBase = BASE_ASSETS.includes(base as "USDT" | "USDC") ? base : "USDT";

    if (live) {
      const prices = await fetchStablecoinPrices(validBase as "USDT" | "USDC", size);
      return NextResponse.json({
        success: true,
        base: validBase,
        size,
        timestamp: Math.floor(Date.now() / 1000),
        prices,
        source: "0x",
      });
    }

    // Database fallback (for historical data)
    await initializeDb();
    await seedStablecoins([...STABLECOINS]);
    const dbPrices = await getLatestPrices();

    if (dbPrices.length === 0 || dbPrices.every((p) => p.price === null)) {
      const prices = await fetchStablecoinPrices(validBase as "USDT" | "USDC", size);
      return NextResponse.json({
        success: true,
        base: validBase,
        size,
        timestamp: Math.floor(Date.now() / 1000),
        prices,
        source: "0x",
      });
    }

    const adjustedPrices = dbPrices.map((p) => ({
      id: p.id,
      symbol: p.symbol,
      name: p.name,
      price: p.price,
      deviationBps: p.deviation_bps,
    }));

    const latestTimestamp = Math.max(...dbPrices.filter((p) => p.timestamp).map((p) => p.timestamp));
    return NextResponse.json({
      success: true,
      base: validBase,
      size,
      timestamp: latestTimestamp || Math.floor(Date.now() / 1000),
      prices: adjustedPrices,
      source: "database",
    });
  } catch (error) {
    console.error("Prices API error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
