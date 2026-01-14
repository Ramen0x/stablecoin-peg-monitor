import { NextRequest, NextResponse } from "next/server";
import { fetchStablecoinPrices } from "@/lib/aggregator";
import { initializeDb, seedStablecoins, insertPriceSnapshot } from "@/lib/db";
import { STABLECOINS } from "@/lib/constants";

export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization");

    // Only check auth if CRON_SECRET is set and non-empty
    if (cronSecret && cronSecret.length > 0) {
      const expectedAuth = `Bearer ${cronSecret}`;
      if (authHeader !== expectedAuth) {
        console.log("Auth mismatch:", { received: authHeader, expected: expectedAuth });
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    await initializeDb();
    await seedStablecoins([...STABLECOINS]);

    // Fetch prices using USDT as base, 1M size (default for historical storage)
    const { prices, source } = await fetchStablecoinPrices("USDT", "1M");
    const timestamp = Math.floor(Date.now() / 1000);

    let inserted = 0;
    for (const price of prices) {
      if (price.price !== null && price.deviationBps !== null) {
        await insertPriceSnapshot(price.id, price.price, price.deviationBps, timestamp);
        inserted++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Fetched and stored ${inserted} price snapshots via ${source}`,
      timestamp,
      source,
      prices: prices.map((p) => ({
        symbol: p.symbol,
        price: p.price,
        deviationBps: p.deviationBps,
      })),
    });
  } catch (error) {
    console.error("Cron fetch error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
