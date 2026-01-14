// Multi-aggregator client: Query ALL aggregators in parallel, pick best price
import { STABLECOINS, TRADE_SIZES, type TradeSize } from "./constants";
import { calculateDeviationBps } from "./utils";

const CHAIN_ID = 1; // Ethereum mainnet
const TAKER_ADDRESS = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
const TIMEOUT_MS = 10000;

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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const params = new URLSearchParams({
      chainId: CHAIN_ID.toString(),
      sellToken,
      buyToken,
      sellAmount,
      taker: TAKER_ADDRESS,
    });

    const response = await fetch(
      `https://api.0x.org/swap/allowance-holder/price?${params.toString()}`,
      {
        headers: { "0x-api-key": apiKey, "0x-version": "v2" },
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);
    if (!response.ok) return null;

    const data = await response.json();
    if (!data.buyAmount || data.liquidityAvailable === false) return null;

    return {
      buyAmount: data.buyAmount,
      sellAmount: data.sellAmount || sellAmount,
      source: "0x",
    };
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

// ============ Odos API ============
async function fetchOdosQuote(
  sellToken: string,
  buyToken: string,
  sellAmount: string
): Promise<QuoteResult | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch("https://api.odos.xyz/sor/quote/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chainId: CHAIN_ID,
        inputTokens: [{ tokenAddress: sellToken, amount: sellAmount }],
        outputTokens: [{ tokenAddress: buyToken, proportion: 1 }],
        slippageLimitPercent: 0.5,
        userAddr: TAKER_ADDRESS,
        simple: true,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    if (!response.ok) return null;

    const data = await response.json();
    if (!data.outAmounts || data.outAmounts.length === 0) return null;

    return {
      buyAmount: data.outAmounts[0],
      sellAmount: data.inAmounts?.[0] || sellAmount,
      source: "odos",
    };
  } catch {
    clearTimeout(timeout);
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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

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
        headers: { Accept: "application/json" },
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);
    if (!response.ok) return null;

    const data = await response.json();
    if (!data.priceRoute?.destAmount) return null;

    return {
      buyAmount: data.priceRoute.destAmount,
      sellAmount: data.priceRoute.srcAmount || sellAmount,
      source: "paraswap",
    };
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

// ============ Parallel Query - Pick Best Price ============
async function fetchBestQuote(
  sellToken: string,
  buyToken: string,
  sellAmount: string,
  sellDecimals: number,
  buyDecimals: number
): Promise<QuoteResult | null> {
  // Query all aggregators in parallel
  const [odosQuote, paraswapQuote, zeroxQuote] = await Promise.all([
    fetchOdosQuote(sellToken, buyToken, sellAmount),
    fetchParaSwapQuote(sellToken, buyToken, sellAmount, sellDecimals, buyDecimals),
    fetch0xQuote(sellToken, buyToken, sellAmount),
  ]);

  // Collect successful quotes
  const quotes = [odosQuote, paraswapQuote, zeroxQuote].filter(
    (q): q is QuoteResult => q !== null
  );

  if (quotes.length === 0) return null;

  // Pick the quote with highest buyAmount (best price for user)
  return quotes.reduce((best, current) => {
    try {
      const bestAmt = BigInt(best.buyAmount);
      const currAmt = BigInt(current.buyAmount);
      return currAmt > bestAmt ? current : best;
    } catch {
      return best;
    }
  });
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
  const sourceCounts: Record<string, number> = {};

  // Process all coins in parallel
  const coinPromises = STABLECOINS.map(async (coin) => {
    if (coin.symbol === baseAsset) {
      return {
        id: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        address: coin.address,
        prices: {
          "1M": { price: 1, deviationBps: 0, buyAmount: "0", sellAmount: "0", source: "base" },
          "5M": { price: 1, deviationBps: 0, buyAmount: "0", sellAmount: "0", source: "base" },
          "10M": { price: 1, deviationBps: 0, buyAmount: "0", sellAmount: "0", source: "base" },
        } as StablecoinQuote["prices"],
      };
    }

    const prices: StablecoinQuote["prices"] = { "1M": null, "5M": null, "10M": null };

    // Fetch all sizes in parallel for this coin
    const sizeResults = await Promise.all(
      TRADE_SIZES.map(async (size) => {
        const sellAmountRaw = (size.value * Math.pow(10, baseToken.decimals)).toString();
        const quote = await fetchBestQuote(
          baseToken.address,
          coin.address,
          sellAmountRaw,
          baseToken.decimals,
          coin.decimals
        );
        return { size: size.label, quote, sellAmountRaw };
      })
    );

    for (const { size, quote, sellAmountRaw } of sizeResults) {
      if (quote) {
        const price = calculatePrice(
          quote.sellAmount || sellAmountRaw,
          quote.buyAmount,
          baseToken.decimals,
          coin.decimals
        );

        const effectivePrice = 1 / price;
        const deviationBps = calculateDeviationBps(1 / effectivePrice);

        prices[size] = {
          price: 1 / effectivePrice,
          deviationBps,
          buyAmount: quote.buyAmount,
          sellAmount: quote.sellAmount,
          source: quote.source,
        };

        sourceCounts[quote.source] = (sourceCounts[quote.source] || 0) + 1;
      }
    }

    return {
      id: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      address: coin.address,
      prices,
    };
  });

  const coinResults = await Promise.all(coinPromises);
  results.push(...coinResults);

  // Determine primary source (most used)
  const primarySource = Object.entries(sourceCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || "multi";

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
      pricesBySize[size.label] = sizePrice
        ? { price: sizePrice.price, deviationBps: sizePrice.deviationBps, source: sizePrice.source }
        : { price: null, deviationBps: null };
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
