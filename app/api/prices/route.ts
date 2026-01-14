import { NextRequest, NextResponse } from "next/server";
import { getLatestPrices, initializeDb, seedStablecoins } from "@/lib/db";
import { fetchStablecoinPrices, calculateRelativeDeviations } from "@/lib/defillama";
import { STABLECOINS, BASE_ASSETS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const base = searchParams.get("base") || "USD";
    const live = searchParams.get("live") === "true";

    if (live) {
      const prices = await fetchStablecoinPrices();
      const adjustedPrices = base !== "USD" && BASE_ASSETS.includes(base as "USDT" | "USDC")
        ? calculateRelativeDeviations(prices, base)
        : prices;
      return NextResponse.json({ success: true, base, timestamp: Math.floor(Date.now() / 1000), prices: adjustedPrices });
    }

    await initializeDb();
    await seedStablecoins([...STABLECOINS]);
    const dbPrices = await getLatestPrices();

    if (dbPrices.length === 0 || dbPrices.every((p) => p.price === null)) {
      const prices = await fetchStablecoinPrices();
      return NextResponse.json({ success: true, base, timestamp: Math.floor(Date.now() / 1000), prices, source: "live" });
    }

    let adjustedPrices = dbPrices.map((p) => ({ id: p.id, symbol: p.symbol, name: p.name, price: p.price, deviationBps: p.deviation_bps }));
    if (base !== "USD" && BASE_ASSETS.includes(base as "USDT" | "USDC")) {
      adjustedPrices = calculateRelativeDeviations(adjustedPrices, base);
    }
    const latestTimestamp = Math.max(...dbPrices.filter((p) => p.timestamp).map((p) => p.timestamp));
    return NextResponse.json({ success: true, base, timestamp: latestTimestamp || Math.floor(Date.now() / 1000), prices: adjustedPrices, source: "database" });
  } catch (error) {
    console.error("Prices API error:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
