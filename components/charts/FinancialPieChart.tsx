"use client";

import { Pie, PieChart, Cell, Label } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { CategorySlice } from "@/lib/charts/aggregateTransactions";
import { ChartLegendGrid } from "@/components/charts/ChartLegendGrid";
import { cn } from "@/lib/utils";

interface FinancialPieChartProps {
  data: CategorySlice[];
  height?: number;
  valuePrefix?: string;
  showTotal?: boolean;
  showSliceLabels?: boolean;
  className?: string;
}

export default function FinancialPieChart({
  data,
  height = 300,
  valuePrefix = "GHS ",
  showTotal = true,
  showSliceLabels = false,
  className,
}: FinancialPieChartProps) {
  const config = data.reduce((acc, slice) => {
    acc[slice.name] = {
      label: slice.name,
      color: slice.fill ?? "hsl(var(--chart-1))",
    };
    return acc;
  }, {} as ChartConfig);

  const total = data.reduce((s, d) => s + d.value, 0);

  if (!data.length || total === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground rounded-lg border border-dashed bg-muted/20"
        style={{ height }}
      >
        No data for pie chart
      </div>
    );
  }

  const chartData = data.map((d) => ({ ...d, key: d.name }));
  const chartHeight = Math.max(220, height - 100);

  const legendItems = data.map((slice) => ({
    name: slice.name,
    color: slice.fill,
    value: slice.value,
    percent: total > 0 ? (slice.value / total) * 100 : 0,
    valuePrefix,
  }));

  return (
    <div className={cn("w-full min-w-0 flex flex-col", className)}>
      <ChartContainer
        config={config}
        data-chart-fixed-height
        className="w-full min-w-0 aspect-auto"
        style={{ height: chartHeight, minHeight: chartHeight }}
      >
        <PieChart margin={{ top: 12, right: 12, bottom: 12, left: 12 }}>
          <ChartTooltip
            content={
              <ChartTooltipContent
                hideLabel
                formatter={(value, name) => [
                  `${valuePrefix}${Number(value).toLocaleString()}`,
                  String(name),
                ]}
              />
            }
          />
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius={showTotal ? 58 : 0}
            outerRadius={showTotal ? 88 : 100}
            paddingAngle={3}
            strokeWidth={2}
            stroke="hsl(var(--background))"
            label={showSliceLabels}
            labelLine={showSliceLabels}
          >
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
            {showTotal && (
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy ?? 0) - 8}
                          className="fill-foreground text-base font-bold"
                        >
                          {valuePrefix}
                          {total.toLocaleString(undefined, {
                            maximumFractionDigits: 0,
                          })}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy ?? 0) + 14}
                          className="fill-muted-foreground text-[11px]"
                        >
                          Total
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            )}
          </Pie>
        </PieChart>
      </ChartContainer>

      <ChartLegendGrid items={legendItems} columns={2} />
    </div>
  );
}
