"use client";

import { useEffect, useRef } from "react";
import {
  AreaSeries,
  ColorType,
  createChart,
  CrosshairMode,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import { getChartTheme, toChartTime, withAlpha } from "@/lib/charts/theme";
import { cn } from "@/lib/utils";

export interface LiveChartPoint {
  time: string;
  value: number;
}

export interface LiveChartSeries {
  id: string;
  data: LiveChartPoint[];
  type?: "area" | "line";
  color?: string;
  name?: string;
}

interface FinancialLiveChartProps {
  series: LiveChartSeries[];
  height?: number;
  className?: string;
  /** Show GHS on price scale */
  currency?: string;
}

export default function FinancialLiveChart({
  series,
  height = 320,
  className,
  currency = "GHS",
}: FinancialLiveChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRefs = useRef<ISeriesApi<"Area" | "Line">[]>([]);

  useEffect(() => {
    if (!containerRef.current || series.length === 0) return;

    const theme = getChartTheme();
    const chart = createChart(containerRef.current, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: theme.background },
        textColor: theme.text,
        fontFamily: "inherit",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: theme.grid },
        horzLines: { color: theme.grid },
      },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: { width: 1, color: theme.chart1, style: 2 },
        horzLine: { width: 1, color: theme.chart1, style: 2 },
      },
      rightPriceScale: {
        borderVisible: false,
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: { vertTouchDrag: false },
    });

    chartRef.current = chart;
    seriesRefs.current = [];

    const colors = [
      theme.chart1,
      theme.chart2,
      theme.chart3,
      theme.chart4,
      theme.chart5,
    ];

    series.forEach((s, index) => {
      const color = s.color ?? colors[index % colors.length];
      const chartData = s.data
        .filter((p) => p.value != null && !Number.isNaN(p.value))
        .map((p) => ({
          time: toChartTime(p.time) as Time,
          value: p.value,
        }));

      if (chartData.length === 0) return;

      if (s.type === "line") {
        const line = chart.addSeries(LineSeries, {
          color,
          lineWidth: 2,
          title: s.name,
          priceFormat: {
            type: "custom",
            formatter: (price: number) =>
              `${currency} ${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
          },
        });
        line.setData(chartData);
        seriesRefs.current.push(line);
      } else {
        const area = chart.addSeries(AreaSeries, {
          lineColor: color,
          topColor: withAlpha(color, 0.25),
          bottomColor: withAlpha(color, 0.02),
          lineWidth: 2,
          title: s.name,
          priceFormat: {
            type: "custom",
            formatter: (price: number) =>
              `${currency} ${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
          },
        });
        area.setData(chartData);
        seriesRefs.current.push(area);
      }
    });

    chart.timeScale().fitContent();

    const resize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
        });
      }
    };

    const observer = new ResizeObserver(resize);
    observer.observe(containerRef.current);
    resize();

    const onThemeChange = () => {
      const t = getChartTheme();
      chart.applyOptions({
        layout: { textColor: t.text },
        grid: {
          vertLines: { color: t.grid },
          horzLines: { color: t.grid },
        },
      });
    };

    const htmlObserver = new MutationObserver(onThemeChange);
    htmlObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      observer.disconnect();
      htmlObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRefs.current = [];
    };
  }, [series, height, currency]);

  if (series.every((s) => s.data.length === 0)) {
    return (
      <div
        className={cn(
          "flex items-center justify-center text-sm text-muted-foreground rounded-lg border border-dashed",
          className,
        )}
        style={{ height }}
      >
        No chart data available
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("w-full rounded-lg overflow-hidden", className)}
      style={{ height }}
    />
  );
}
