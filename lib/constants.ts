// Stablecoins to track with their DeFiLlama IDs
export const STABLECOINS = [
  { id: "tether", symbol: "USDT", name: "Tether" },
  { id: "usd-coin", symbol: "USDC", name: "USD Coin" },
  { id: "ripple-usd", symbol: "RLUSD", name: "Ripple USD" },
  { id: "paypal-usd", symbol: "PYUSD", name: "PayPal USD" },
  { id: "ethena-usde", symbol: "USDe", name: "Ethena USDe" },
  { id: "agora-dollar", symbol: "AUSD", name: "Agora Dollar" },
  { id: "dai", symbol: "DAI", name: "Dai" },
  { id: "usds", symbol: "USDS", name: "Sky Dollar" },
  { id: "frax", symbol: "FRAX", name: "Frax" },
  { id: "gho", symbol: "GHO", name: "Aave GHO" },
  { id: "first-digital-usd", symbol: "FDUSD", name: "First Digital USD" },
  { id: "true-usd", symbol: "TUSD", name: "TrueUSD" },
  { id: "crvusd", symbol: "crvUSD", name: "Curve USD" },
  { id: "liquity-usd", symbol: "LUSD", name: "Liquity USD" },
  { id: "usual-usd", symbol: "USD0", name: "Usual USD" },
] as const;

export type StablecoinId = (typeof STABLECOINS)[number]["id"];
export type StablecoinSymbol = (typeof STABLECOINS)[number]["symbol"];

export const BASE_ASSETS = ["USDT", "USDC"] as const;
export type BaseAsset = (typeof BASE_ASSETS)[number];

export const TIMEFRAMES = [
  { label: "24h", hours: 24 },
  { label: "7d", hours: 168 },
  { label: "30d", hours: 720 },
  { label: "90d", hours: 2160 },
  { label: "All", hours: -1 },
] as const;

export type TimeframeLabel = (typeof TIMEFRAMES)[number]["label"];

export const DEVIATION_THRESHOLDS = {
  STABLE: 5,
  WARNING: 25,
} as const;

export const REFRESH_INTERVAL = 5 * 60 * 1000;
