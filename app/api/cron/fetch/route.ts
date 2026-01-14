import { NextRequest, NextResponse } from "next/server";
import { fetchStablecoinPrices } from "@/lib/defillama";
import { initializeDb, seedStablecoins, insertPriceSnapshot } from "@/lib/db";
import { STABLECOINS } from "@/lib/constants";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await initializeDb();
    await seedStablecoins([...STABLECOINS]);
    const prices = await fetchStablecoinPrices();
    const timestamp = Math.floor(Date.now() / 1000);
    let inserted = 0;
    for (const price of prices) {
      await insertPriceSnapshot(price.id, price.price, price.deviationBps, timestamp);
      inserted++;
    }
    return NextResponse.json({ success: true, message: `Fetched and stored ${inserted} price snapshots`, timestamp, prices: prices.map((p) => ({ symbol: p.symbol, price: p.price, deviationBps: p.deviationBps })) });
  } catch (error) {
    console.error("Cron fetch error:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) { return GET(request); }
