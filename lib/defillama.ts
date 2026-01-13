import { STABLECOINS } from "./constants";
import { calculateDeviationBps } from "./utils";

const DEFILLAMA_API_BASE = "https://stablecoins.llama.fi";

interface StablecoinPrice {
  id: string;
  symbol: string;
  name: string;
  price: number;
  deviationBps: number;
}

export async function fetchStablecoinPrices(): Promise<StablecoinPrice[]> {
  try {
    const response = await fetch(`${DEFILLAMA_API_BASE}/stablecoinprices`, { next: { revalidate: 0 } });
    if (!response.ok) throw new Error(`DeFiLlama API error: ${response.status}`);
    const data = await response.json();
    if (!data || data.length === 0) throw new Error("No price data received from DeFiLlama");
    const priceMap = data[0].prices;
    const prices: StablecoinPrice[] = [];
    for (const coin of STABLECOINS) {
      const price = priceMap[coin.id];
      if (price !== undefined) {
        prices.push({ id: coin.id, symbol: coin.symbol, name: coin.name, price, deviationBps: calculateDeviationBps(price) });
      } else {
        console.warn(`Price not found for ${coin.symbol} (${coin.id})`);
      }
    }
    return prices;
  } catch (error) {
    console.error("Error fetching stablecoin prices:", error);
    throw error;
  }
}

export function getBaseAssetPrice(prices: StablecoinPrice[], baseSymbol: string): number {
  const baseAsset = prices.find((p) => p.symbol === baseSymbol);
  return baseAsset?.price ?? 1.0;
}

export function calculateRelativeDeviations(prices: StablecoinPrice[], baseSymbol: string): StablecoinPrice[] {
  const basePrice = getBaseAssetPrice(prices, baseSymbol);
  return prices.map((coin) => ({
    ...coin,
    deviationBps: coin.symbol === baseSymbol ? 0 : calculateDeviationBps(coin.price, basePrice),
  }));
}
