// Multi-aggregator client with fallback: 0x -> Odos -> ParaSwap
import { STABLECOINS, TRADE_SIZES, type TradeSize } from "./constants";
import { calculateDeviationBps } from "./utils";

const CHAIN_ID = 1; // Ethereum mainnet

// Taker address for price quotes (must be a valid address)
const TAKER_ADDRESS = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

interface QuoteResult {
  buyAmount: string;
  sellAmount: string;
  source: string;
}

// ============ 0x API ============
async function fetch0xQuote(
  sellToken: string,
  buyToken: string,
  sellAmount: string
): Promise<QuoteResult | null> {
  const apiKey = process.env.ZEROX_API_KEY;
  if (!apiKey) return null;

  const params = new URLSearchParams({
    chainId: CHAIN_ID.toString(),
    sellToken,
    buyToken,
    sellAmount,
    taker: TAKER_ADDRESS,
  });

  try {
    const response = await fetch(
      `https://api.0x.org/swap/allowance-holder/price?${params.toString()}`,
      {
        headers: {
          "0x-api-key": apiKey,
          "0x-version": "v2",
        },
        next: { revalidate: 0 },
      }
    );

    if (!response.ok) {
      console.error(`0x API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return {
      buyAmount: data.buyAmount,
      sellAmount: data.sellAmount || sellAmount,
      source: "0x",
    };
  } catch (error) {
    console.error("0x API failed:", error);
    return null;
  }
}

// ============ Odos API ============
async function fetchOdosQuote(
  sellToken: string,
  buyToken: string,
  sellAmount: string
): Promise<QuoteResult | null> {
  try {
    const response = await fetch("https://api.odos.xyz/sor/quote/v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chainId: CHAIN_ID,
        inputTokens: [{ tokenAddress: sellToken, amount: sellAmount }],
        outputTokens: [{ tokenAddress: buyToken, proportion: 1 }],
        slippageLimitPercent: 0.5,
        userAddr: TAKER_ADDRESS,
        simple: true,
      }),
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      console.error(`Odos API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (!data.outAmounts || data.outAmounts.length === 0) return null;

    return {
      buyAmount: data.outAmounts[0],
      sellAmount: data.inAmounts?.[0] || sellAmount,
      source: "odos",
    };
  } catch (error) {
    console.error("Odos API failed:", error);
    return null;
  }
}

// ============ ParaSwap API ============
async function fetchParaSwapQuote(
  sellToken: string,
  buyToken: string,
  sellAmount: string,
  sellDecimals: number,
  buyDecimals: number
): Promise<QuoteResult | null> {
  try {
    const params = new URLSearchParams({
      srcToken: sellToken,
      destToken: buyToken,
      amount: sellAmount,
      srcDecimals: sellDecimals.toString(),
      destDecimals: buyDecimals.toString(),
      side: "SELL",
      network: CHAIN_ID.toString(),
    });

    const response = await fetch(
      `https://api.paraswap.io/prices?${params.toString()}`,
      {
        headers: {
          Accept: "application/json",
        },
        next: { revalidate: 0 },
      }
    );

    if (!response.ok) {
      console.error(`ParaSwap API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (!data.priceRoute) return null;

    return {
      buyAmount: data.priceRoute.destAmount,
      sellAmount: data.priceRoute.srcAmount || sellAmount,
      source: "paraswap",
    };
  } catch (error) {
    console.error("ParaSwap API failed:", error);
    return null;
  }
}

// ============ Unified Quote Fetcher with Fallback ============
// Order: Odos (most reliable) → ParaSwap (often best prices) → 0x (backup)
async function fetchQuoteWithFallback(
  sellToken: string,
  buyToken: string,
  sellAmount: string,
  sellDecimals: number,
  buyDecimals: number
): Promise<QuoteResult | null> {
  // Try Odos first (most reliable, good coverage)
  let quote = await fetchOdosQuote(sellToken, buyToken, sellAmount);
  if (quote) return quote;

  // Try ParaSwap (often has best prices)
  quote = await fetchParaSwapQuote(sellToken, buyToken, sellAmount, sellDecimals, buyDecimals);
  if (quote) return quote;

  // Try 0x as fallback
  quote = await fetch0xQuote(sellToken, buyToken, sellAmount);
  if (quote) return quote;

  return null;
}

function calculatePrice(
  sellAmount: string,
  buyAmount: string,
  sellDecimals: number,
  buyDecimals: number
): number {
  const sellAmountNormalized = Number(sellAmount) / Math.pow(10, sellDecimals);
  const buyAmountNormalized = Number(buyAmount) / Math.pow(10, buyDecimals);
  return buyAmountNormalized / sellAmountNormalized;
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
      source: string;
    } | null;
  };
}

export async function fetchStablecoinQuotes(
  baseAsset: "USDT" | "USDC" = "USDT"
): Promise<{ quotes: StablecoinQuote[]; primarySource: string }> {
  const baseToken = STABLECOINS.find((s) => s.symbol === baseAsset);
  if (!baseToken) {
    throw new Error(`Base asset ${baseAsset} not found in stablecoins list`);
  }

  const results: StablecoinQuote[] = [];
  let primarySource = "aggregator";

  for (const coin of STABLECOINS) {
    if (coin.symbol === baseAsset) {
      results.push({
        id: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        address: coin.address,
        prices: {
          "1M": { price: 1, deviationBps: 0, buyAmount: "0", sellAmount: "0", source: "base" },
          "5M": { price: 1, deviationBps: 0, buyAmount: "0", sellAmount: "0", source: "base" },
          "10M": { price: 1, deviationBps: 0, buyAmount: "0", sellAmount: "0", source: "base" },
        },
      });
      continue;
    }

    const prices: StablecoinQuote["prices"] = {
      "1M": null,
      "5M": null,
      "10M": null,
    };

    for (const size of TRADE_SIZES) {
      const sellAmountRaw = (size.value * Math.pow(10, baseToken.decimals)).toString();

      const quote = await fetchQuoteWithFallback(
        baseToken.address,
        coin.address,
        sellAmountRaw,
        baseToken.decimals,
        coin.decimals
      );

      if (quote) {
        const price = calculatePrice(
          quote.sellAmount,
          quote.buyAmount,
          baseToken.decimals,
          coin.decimals
        );

        const effectivePrice = 1 / price;
        const deviationBps = calculateDeviationBps(1 / effectivePrice);

        prices[size.label] = {
          price: 1 / effectivePrice,
          deviationBps,
          buyAmount: quote.buyAmount,
          sellAmount: quote.sellAmount,
          source: quote.source,
        };

        // Track primary source from first successful quote
        if (primarySource === "aggregator") {
          primarySource = quote.source;
        }
      }

      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    results.push({
      id: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      address: coin.address,
      prices,
    });
  }

  return { quotes: results, primarySource };
}

export interface StablecoinPrice {
  id: string;
  symbol: string;
  name: string;
  price: number | null;
  deviationBps: number | null;
  pricesBySize?: {
    [key in TradeSize]?: {
      price: number | null;
      deviationBps: number | null;
      source?: string;
    };
  };
}

export async function fetchStablecoinPrices(
  baseAsset: "USDT" | "USDC" = "USDT",
  primarySize: TradeSize = "1M"
): Promise<{ prices: StablecoinPrice[]; source: string }> {
  const { quotes, primarySource } = await fetchStablecoinQuotes(baseAsset);

  const prices = quotes.map((quote) => {
    const primaryPrice = quote.prices[primarySize];
    const pricesBySize: StablecoinPrice["pricesBySize"] = {};

    for (const size of TRADE_SIZES) {
      const sizePrice = quote.prices[size.label];
      if (sizePrice) {
        pricesBySize[size.label] = {
          price: sizePrice.price,
          deviationBps: sizePrice.deviationBps,
          source: sizePrice.source,
        };
      } else {
        pricesBySize[size.label] = {
          price: null,
          deviationBps: null,
        };
      }
    }

    return {
      id: quote.id,
      symbol: quote.symbol,
      name: quote.name,
      price: primaryPrice?.price ?? null,
      deviationBps: primaryPrice?.deviationBps ?? null,
      pricesBySize,
    };
  });

  return { prices, source: primarySource };
}
