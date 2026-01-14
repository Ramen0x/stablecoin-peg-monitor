import { DEVIATION_THRESHOLDS } from "./constants";

export function calculateDeviationBps(price: number, pegValue: number = 1.0): number {
  const deviation = ((price - pegValue) / pegValue) * 10000;
  return Math.round(deviation * 100) / 100;
}

export function getDeviationColor(deviationBps: number | null): string {
  if (deviationBps === null) return "text-zinc-500";
  const absDeviation = Math.abs(deviationBps);
  if (absDeviation <= DEVIATION_THRESHOLDS.STABLE) return "text-green-500";
  if (absDeviation <= DEVIATION_THRESHOLDS.WARNING) return "text-yellow-500";
  return "text-red-500";
}

export function getBarColor(deviationBps: number | null): string {
  if (deviationBps === null) return "#71717a"; // zinc-500
  const absDeviation = Math.abs(deviationBps);
  if (absDeviation <= DEVIATION_THRESHOLDS.STABLE) return "#22c55e";
  if (absDeviation <= DEVIATION_THRESHOLDS.WARNING) return "#eab308";
  return "#ef4444";
}

export function formatBps(bps: number | null): string {
  if (bps === null) return "N/A";
  const sign = bps >= 0 ? "+" : "";
  return `${sign}${bps.toFixed(2)} bps`;
}

export function formatPrice(price: number | null): string {
  if (price === null) return "N/A";
  return `$${price.toFixed(6)}`;
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}

export function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp * 1000;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
