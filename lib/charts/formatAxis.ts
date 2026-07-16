/** Compact GHS labels for chart axes (e.g. GHS 1.2k, GHS 728k). */
export function formatCompactGhs(value: number, prefix = "GHS "): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return `${prefix}0`;
  const abs = Math.abs(n);
  if (abs >= 1_000_000) {
    return `${prefix}${(n / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `${prefix}${(n / 1_000).toFixed(1)}k`;
  }
  return `${prefix}${Math.round(n).toLocaleString()}`;
}

export function truncateLabel(label: string, max = 12): string {
  if (label.length <= max) return label;
  return `${label.slice(0, max - 1)}…`;
}
