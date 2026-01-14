// Stablecoins to track with their Ethereum mainnet contract addresses
export const STABLECOINS = [
  { id: "tether", symbol: "USDT", name: "Tether", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6 },
  { id: "usd-coin", symbol: "USDC", name: "USD Coin", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6 },
  { id: "ripple-usd", symbol: "RLUSD", name: "Ripple USD", address: "0x8292bb45bf1ee4d140127049757c2e0ff06317ed", decimals: 18 },
  { id: "paypal-usd", symbol: "PYUSD", name: "PayPal USD", address: "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8", decimals: 6 },
  { id: "ethena-usde", symbol: "USDe", name: "Ethena USDe", address: "0x4c9EDD5852cd905f086C759E8383e09bff1E68B3", decimals: 18 },
  { id: "agora-dollar", symbol: "AUSD", name: "Agora Dollar", address: "0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a", decimals: 6 },
  { id: "dai", symbol: "DAI", name: "Dai", address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", decimals: 18 },
  { id: "usds", symbol: "USDS", name: "Sky Dollar", address: "0xdC035D45d973E3EC169d2276DDab16f1e407384F", decimals: 18 },
  { id: "frax", symbol: "FRAX", name: "Frax", address: "0x853d955aCEf822Db058eb8505911ED77F175b99e", decimals: 18 },
  { id: "gho", symbol: "GHO", name: "Aave GHO", address: "0x40D16FC0246aD3160Ccc09B8D0D3A2cD28aE6C2f", decimals: 18 },
  { id: "crvusd", symbol: "crvUSD", name: "Curve USD", address: "0xf939E0A03FB07F59A73314E73794Be0E57ac1b4E", decimals: 18 },
  { id: "liquity-usd", symbol: "LUSD", name: "Liquity USD", address: "0x5f98805A4E8be255a32880FDeC7F6728C6568bA0", decimals: 18 },
  { id: "usual-usd", symbol: "USD0", name: "Usual USD", address: "0x73A15FeD60Bf67631dC6cd7Bc5B6e8da8190aCF5", decimals: 18 },
] as const;

export type StablecoinId = (typeof STABLECOINS)[number]["id"];
export type StablecoinSymbol = (typeof STABLECOINS)[number]["symbol"];

export const BASE_ASSETS = ["USDT", "USDC"] as const;
export type BaseAsset = (typeof BASE_ASSETS)[number];

// Trade sizes for DEX quotes (in USD)
export const TRADE_SIZES = [
  { label: "1M" as const, value: 1_000_000 },
  { label: "5M" as const, value: 5_000_000 },
  { label: "10M" as const, value: 10_000_000 },
] as const;

export type TradeSize = (typeof TRADE_SIZES)[number]["label"];

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
