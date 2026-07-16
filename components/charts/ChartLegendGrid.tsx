"use client";

import { cn } from "@/lib/utils";

export interface LegendItem {
  name: string;
  color?: string;
  value?: number;
  percent?: number;
  valuePrefix?: string;
}

interface ChartLegendGridProps {
  items: LegendItem[];
  className?: string;
  columns?: 1 | 2;
}

export function ChartLegendGrid({
  items,
  className,
  columns = 2,
}: ChartLegendGridProps) {
  if (!items.length) return null;

  return (
    <div
      className={cn(
        "grid gap-2 pt-4 mt-1 border-t border-border/60",
        columns === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1",
        className,
      )}
    >
      {items.map((item) => (
        <div
          key={item.name}
          className="flex items-center gap-2.5 rounded-md bg-muted/40 px-2.5 py-2 min-w-0"
          title={
            item.value != null
              ? `${item.name}: ${item.valuePrefix ?? "GHS "}${item.value.toLocaleString()}`
              : item.name
          }
        >
          <span
            className="h-3 w-3 rounded-full shrink-0 ring-2 ring-background"
            style={{ backgroundColor: item.color ?? "hsl(var(--chart-1))" }}
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-foreground truncate leading-tight">
              {item.name}
            </p>
            {item.value != null && (
              <p className="text-[11px] text-muted-foreground tabular-nums">
                {item.valuePrefix ?? "GHS "}
                {item.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                {item.percent != null ? ` · ${item.percent.toFixed(0)}%` : ""}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
