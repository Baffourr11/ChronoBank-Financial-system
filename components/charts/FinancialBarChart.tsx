"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { ChartLegendGrid, type LegendItem } from "@/components/charts/ChartLegendGrid";
import { formatCompactGhs, truncateLabel } from "@/lib/charts/formatAxis";
import { cn } from "@/lib/utils";

export interface BarChartItem {
  [key: string]: string | number;
}

interface BarSeries {
  key: string;
  label: string;
  color?: string;
}

interface FinancialBarChartProps {
  data: BarChartItem[];
  xKey: string;
  bars: BarSeries[];
  height?: number;
  valuePrefix?: string;
  className?: string;
  /** When bars use per-row `fill`, show a category legend below */
  showCategoryLegend?: boolean;
}

export default function FinancialBarChart({
  data,
  xKey,
  bars,
  height = 300,
  valuePrefix = "GHS ",
  className,
  showCategoryLegend = false,
}: FinancialBarChartProps) {
  const hasPerRowColors =
    showCategoryLegend &&
    bars.length === 1 &&
    data.some((row) => typeof row.fill === "string");

  const config = bars.reduce((acc, bar, i) => {
    acc[bar.key] = {
      label: bar.label,
      color: bar.color ?? `hsl(var(--chart-${(i % 5) + 1}))`,
    };
    return acc;
  }, {} as ChartConfig);

  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground rounded-lg border border-dashed bg-muted/20 w-full min-w-0"
        style={{ height }}
      >
        No data for bar chart
      </div>
    );
  }

  const categoryLegendItems: LegendItem[] = hasPerRowColors
    ? data.map((row) => ({
        name: String(row[xKey]),
        color: String(row.fill),
        value: Number(row[bars[0].key]) || 0,
        valuePrefix,
      }))
    : [];

  const chartHeight = hasPerRowColors ? Math.max(200, height - 80) : height;

  return (
    <div className={cn("w-full min-w-0 flex flex-col", className)}>
      <ChartContainer
        config={config}
        data-chart-fixed-height
        className="w-full min-w-0 aspect-auto overflow-hidden"
        style={{ height: chartHeight, minHeight: chartHeight }}
      >
        <BarChart
          data={data}
          margin={{ top: 12, right: 12, left: 4, bottom: 4 }}
        >
          <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
          <XAxis
            dataKey={xKey}
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            angle={hasPerRowColors ? -40 : -35}
            textAnchor="end"
            height={hasPerRowColors ? 80 : 72}
            interval={0}
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => truncateLabel(String(v), 12)}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={76}
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => formatCompactGhs(Number(v), valuePrefix)}
          />
          <ChartTooltip
            cursor={{ fill: "hsl(var(--muted))", opacity: 0.35 }}
            content={
              <ChartTooltipContent
                labelFormatter={(label) => String(label)}
                formatter={(value, name) => [
                  `${valuePrefix}${Number(value).toLocaleString()}`,
                  hasPerRowColors ? String(name) : String(name),
                ]}
              />
            }
          />
          {!hasPerRowColors && (
            <ChartLegend content={<ChartLegendContent />} />
          )}
          {bars.map((bar) => (
            <Bar
              key={bar.key}
              dataKey={bar.key}
              fill={`var(--color-${bar.key})`}
              radius={[6, 6, 0, 0]}
              maxBarSize={hasPerRowColors ? 48 : 56}
              isAnimationActive
            >
              {bars.length === 1 &&
                data.map((row, i) => (
                  <Cell
                    key={`${bar.key}-${i}`}
                    fill={
                      typeof row.fill === "string"
                        ? row.fill
                        : `var(--color-${bar.key})`
                    }
                  />
                ))}
            </Bar>
          ))}
        </BarChart>
      </ChartContainer>

      {hasPerRowColors && (
        <ChartLegendGrid items={categoryLegendItems} columns={2} />
      )}
    </div>
  );
}
