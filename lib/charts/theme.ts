const LIGHT = {
  text: "#737373",
  grid: "#e5e5e5",
  chart1: "#3b82f6",
  chart2: "#10b981",
  chart3: "#84cc16",
  chart4: "#ef4444",
  chart5: "#a855f7",
};

const DARK = {
  text: "#8b9cb8",
  grid: "#141f33",
  chart1: "#3b6fd9",
  chart2: "#4a7fd4",
  chart3: "#9fd356",
  chart4: "#e85d5d",
  chart5: "#8b6fd4",
};

function isRgbOrHex(color: string): boolean {
  return /^#[0-9a-f]{3,8}$/i.test(color) || /^rgba?\(/i.test(color);
}

/** Resolve CSS variable to rgb/hex — lightweight-charts cannot parse oklch/lab. */
export function getChartColor(variable: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;

  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) return fallback;

  ctx.fillStyle = fallback;
  ctx.fillStyle = `var(${variable}, ${fallback})`;
  const resolved = ctx.fillStyle;

  if (typeof resolved === "string" && isRgbOrHex(resolved)) {
    return resolved;
  }

  return fallback;
}

export function getChartTheme() {
  const dark =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");
  const defaults = dark ? DARK : LIGHT;

  return {
    text: getChartColor("--muted-foreground", defaults.text),
    grid: getChartColor("--border", defaults.grid),
    chart1: getChartColor("--chart-1", defaults.chart1),
    chart2: getChartColor("--chart-2", defaults.chart2),
    chart3: getChartColor("--chart-3", defaults.chart3),
    chart4: getChartColor("--chart-4", defaults.chart4),
    chart5: getChartColor("--chart-5", defaults.chart5),
    background: "transparent",
  };
}

/** Apply alpha to rgb/hex for area series fills. */
export function withAlpha(color: string, alpha: number): string {
  if (color.startsWith("#")) {
    const hex = color.replace("#", "");
    const full =
      hex.length === 3
        ? hex
            .split("")
            .map((c) => c + c)
            .join("")
        : hex.slice(0, 6);
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) {
    return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alpha})`;
  }
  return color;
}

/** ISO or date label → YYYY-MM-DD for lightweight-charts */
export function toChartTime(date: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date.slice(0, 10);
  return d.toISOString().slice(0, 10);
}
