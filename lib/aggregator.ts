// 0x API client for fetching real DEX swap quotes
import { STABLECOINS, TRADE_SIZES, type TradeSize } from "./constants";
import { calculateDeviationBps } from "./utils";

const ZEROX_API_BASE = "https://api.0x.org";
const CHAIN_ID = 1; // Ethereum mainnet

// Dummy taker address for price quotes (doesn't need to hold tokens for indicative prices)
const TAKER_ADDRESS = "0x0000000000000000000000000000000000000001";

interface QuoteResponse {
  buyAmount: string;
  sellAmount: string;
  estimatedPriceImpact?: string;
  liquidityAvailable?: boolean;
}

interface StablecoinQuote {
  id: string;
  symbol: string;
  name: string;
  address: string;
  prices: {
    [key in TradeSize]: {
      price: number;
      deviationBps: number;
      buyAmount: string;
      sellAmount: string;
      priceImpact: number | null;
      liquidityAvailable: boolean;
    } | null;
  };
}

async function fetchQuote(
  sellToken: string,
  buyToken: string,
  sellAmount: string
): Promise<QuoteResponse | null> {
  const apiKey = process.env.ZEROX_API_KEY;
  if (!apiKey) {
    throw new Error("ZEROX_API_KEY environment variable is not set");
  }

  const params = new URLSearchParams({
    chainId: CHAIN_ID.toString(),
    sellToken,
    buyToken,
    sellAmount,
    taker: TAKER_ADDRESS,
  });

  try {
    const response = await fetch(
      `${ZEROX_API_BASE}/swap/allowance-holder/price?${params.toString()}`,
      {
        headers: {
          "0x-api-key": apiKey,
          "0x-version": "v2",
        },
        next: { revalidate: 0 },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`0x API error for ${sellToken} -> ${buyToken}: ${response.status} - ${errorText}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch quote for ${sellToken} -> ${buyToken}:`, error);
    return null;
  }
}

function calculatePrice(sellAmount: string, buyAmount: string, sellDecimals: number, buyDecimals: number): number {
  const sellAmountNormalized = Number(sellAmount) / Math.pow(10, sellDecimals);
  const buyAmountNormalized = Number(buyAmount) / Math.pow(10, buyDecimals);
  // Price = how much buyToken you get per 1 sellToken
  // For stablecoin pairs, if both are pegged to $1, price should be ~1
  return buyAmountNormalized / sellAmountNormalized;
}

export async function fetchStablecoinQuotes(
  baseAsset: "USDT" | "USDC" = "USDT"
): Promise<StablecoinQuote[]> {
  const baseToken = STABLECOINS.find((s) => s.symbol === baseAsset);
  if (!baseToken) {
    throw new Error(`Base asset ${baseAsset} not found in stablecoins list`);
  }

  const results: StablecoinQuote[] = [];

  // Fetch quotes for each stablecoin against the base asset
  for (const coin of STABLECOINS) {
    // Skip if same as base asset
    if (coin.symbol === baseAsset) {
      results.push({
        id: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        address: coin.address,
        prices: {
          "1M": { price: 1, deviationBps: 0, buyAmount: "0", sellAmount: "0", priceImpact: 0, liquidityAvailable: true },
          "5M": { price: 1, deviationBps: 0, buyAmount: "0", sellAmount: "0", priceImpact: 0, liquidityAvailable: true },
          "10M": { price: 1, deviationBps: 0, buyAmount: "0", sellAmount: "0", priceImpact: 0, liquidityAvailable: true },
        },
      });
      continue;
    }

    const prices: StablecoinQuote["prices"] = {
      "1M": null,
      "5M": null,
      "10M": null,
    };

    // Fetch quote for each trade size
    for (const size of TRADE_SIZES) {
      // Calculate sell amount in base token units (USDT/USDC have 6 decimals)
      const sellAmountRaw = (size.value * Math.pow(10, baseToken.decimals)).toString();

      // We're selling base asset (USDT/USDC) to buy the target stablecoin
      // This tells us how much of the target coin we get for our base asset
      const quote = await fetchQuote(baseToken.address, coin.address, sellAmountRaw);

      if (quote) {
        // Price = buyAmount / sellAmount (normalized)
        // If we sell 1M USDT and get 999,500 DAI, the price is 0.9995 (DAI is slightly expensive)
        // Actually, we want to show the price of the TARGET coin in terms of base
        // price = sellAmount / buyAmount = how much base you need per 1 target coin
        const price = calculatePrice(
          quote.sellAmount || sellAmountRaw,
          quote.buyAmount,
          baseToken.decimals,
          coin.decimals
        );
        
        // Invert to get the price of target coin (how much target per 1 base)
        // Then compare to 1.0 peg
        const effectivePrice = 1 / price; // This is the exchange rate: 1 base = X target
        // For deviation, we want to know if target coin is cheap or expensive
        // If effectivePrice > 1, target is cheap (you get more than 1 for 1 base)
        // If effectivePrice < 1, target is expensive (you get less than 1 for 1 base)
        // Deviation from peg: if effectivePrice = 0.999, target is 0.1% expensive
        const deviationBps = calculateDeviationBps(1 / effectivePrice);

        prices[size.label] = {
          price: 1 / effectivePrice, // Price of target in terms of base
          deviationBps,
          buyAmount: quote.buyAmount,
          sellAmount: quote.sellAmount || sellAmountRaw,
          priceImpact: quote.estimatedPriceImpact ? parseFloat(quote.estimatedPriceImpact) : null,
          liquidityAvailable: quote.liquidityAvailable ?? true,
        };
      }

      // Rate limit: 0x has rate limits, add small delay between requests
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    results.push({
      id: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      address: coin.address,
      prices,
    });
  }

  return results;
}

// Simplified response for the current UI (picks one size)
export interface StablecoinPrice {
  id: string;
  symbol: string;
  name: string;
  price: number;
  deviationBps: number;
  pricesBySize?: {
    [key in TradeSize]?: {
      price: number;
      deviationBps: number;
      priceImpact: number | null;
    };
  };
}

export async function fetchStablecoinPrices(
  baseAsset: "USDT" | "USDC" = "USDT",
  primarySize: TradeSize = "1M"
): Promise<StablecoinPrice[]> {
  const quotes = await fetchStablecoinQuotes(baseAsset);

  return quotes.map((quote) => {
    const primaryPrice = quote.prices[primarySize];
    const pricesBySize: StablecoinPrice["pricesBySize"] = {};

    for (const size of TRADE_SIZES) {
      const sizePrice = quote.prices[size.label];
      if (sizePrice) {
        pricesBySize[size.label] = {
          price: sizePrice.price,
          deviationBps: sizePrice.deviationBps,
          priceImpact: sizePrice.priceImpact,
        };
      }
    }

    return {
      id: quote.id,
      symbol: quote.symbol,
      name: quote.name,
      price: primaryPrice?.price ?? 1,
      deviationBps: primaryPrice?.deviationBps ?? 0,
      pricesBySize,
    };
  });
}

export function calculateRelativeDeviations(
  prices: StablecoinPrice[],
  baseSymbol: string
): StablecoinPrice[] {
  // For 0x quotes, we're already calculating relative to the base asset
  // This function is kept for API compatibility
  return prices.map((coin) => ({
    ...coin,
    deviationBps: coin.symbol === baseSymbol ? 0 : coin.deviationBps,
  }));
}
