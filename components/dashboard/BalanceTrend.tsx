// Path: components/dashboard/BalanceTrend.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Brain, AlertTriangle } from "lucide-react";
import FinancialLiveChart, {
  type LiveChartSeries,
} from "@/components/charts/FinancialLiveChart";
import { getChartTheme } from "@/lib/charts/theme";

interface ForecastData {
  date: string;
  balance: number;
  predicted?: boolean;
  confidence?: number;
}

interface BalanceTrendProps {
  datasetId?: string;
}

export default function BalanceTrend({ datasetId }: BalanceTrendProps) {
  const [data, setData] = useState<ForecastData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [forecast, setForecast] = useState<any>(null);
  const [cashFlowIssues, setCashFlowIssues] = useState<any>(null);

  useEffect(() => {
    if (!datasetId) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const qs = `datasetId=${datasetId}`;
        const transactionsResponse = await fetch(
          `/api/transactions?limit=1000&${qs}`,
        );
        const accountsResponse = await fetch(`/api/accounts?${qs}`);

        if (transactionsResponse.ok && accountsResponse.ok) {
          const transactionsData = await transactionsResponse.json();
          const accountsData = await accountsResponse.json();

          const transactions =
            transactionsData.data?.transactions || transactionsData.data || [];
          const accounts =
            accountsData.data?.accounts || accountsData.data || [];

          const monthlyBalances = calculateMonthlyBalances(
            transactions,
            accounts,
          );

          const forecastResponse = await fetch(
            `/api/analytics/forecast?days=90&${qs}`,
          );
          if (forecastResponse.ok) {
            const forecastData = await forecastResponse.json();
            setForecast(forecastData.data);
            setCashFlowIssues(forecastData.data.cashFlowIssues);

            const combinedData = [
              ...monthlyBalances,
              ...forecastData.data.cashFlowForecast.map((item: any) => ({
                date: item.date,
                balance: item.balance,
                predicted: true,
                confidence: item.confidence,
              })),
            ];

            setData(combinedData);
          } else {
            setData(monthlyBalances);
          }
        }
      } catch (error) {
        console.error("Failed to fetch balance data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [datasetId]);

  const chartSeries = useMemo((): LiveChartSeries[] => {
    if (data.length === 0) return [];

    const theme = typeof window !== "undefined" ? getChartTheme() : null;
    const historical = data.filter((d) => !d.predicted);
    const predicted = data.filter((d) => d.predicted);

    const series: LiveChartSeries[] = [];

    if (historical.length > 0) {
      series.push({
        id: "historical",
        name: "Historical",
        type: "area",
        color: theme?.chart1,
        data: historical.map((d) => ({ time: d.date, value: d.balance })),
      });
    }

    if (predicted.length > 0) {
      const bridge =
        historical.length > 0
          ? [historical[historical.length - 1], ...predicted]
          : predicted;
      series.push({
        id: "forecast",
        name: "Forecast",
        type: "line",
        color: theme?.chart3,
        data: bridge.map((d) => ({ time: d.date, value: d.balance })),
      });
    }

    return series;
  }, [data]);

  const calculateMonthlyBalances = (transactions: any[], accounts: any[]) => {
    const currentBalance = accounts.reduce(
      (sum, acc) => sum + Number(acc.balance ?? 0),
      0,
    );
    const now = new Date();
    const monthBuckets: { label: string; net: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(
        now.getFullYear(),
        now.getMonth() - i + 1,
        0,
        23,
        59,
        59,
      );
      const label = start.toISOString().slice(0, 10);

      const net = transactions
        .filter((tx) => {
          const d = new Date(tx.date);
          return d >= start && d <= end;
        })
        .reduce((sum, tx) => {
          const amt = Number(tx.amount ?? 0);
          return tx.type === "income" ? sum + amt : sum - amt;
        }, 0);

      monthBuckets.push({ label, net });
    }

    const totalNet = monthBuckets.reduce((s, m) => s + m.net, 0);
    let running = currentBalance - totalNet;

    return monthBuckets.map(({ label, net }) => {
      running += net;
      return {
        date: label,
        balance: Math.round(running * 100) / 100,
        predicted: false,
      };
    });
  };

  const getTrendIcon = () => {
    if (
      !forecast?.cashFlowForecast?.length
    )
      return <Brain className="w-4 h-4 text-chart-2" />;

    const finalBalance =
      forecast.cashFlowForecast[forecast.cashFlowForecast.length - 1]
        ?.balance || 0;
    const currentBalance = data.find((d) => !d.predicted)?.balance ?? 0;

    if (finalBalance > currentBalance) {
      return <TrendingUp className="w-4 h-4 text-chart-1" />;
    }
    if (finalBalance < currentBalance) {
      return <TrendingDown className="w-4 h-4 text-chart-4" />;
    }
    return <Brain className="w-4 h-4 text-chart-2" />;
  };

  const getTrendText = () => {
    if (!forecast?.cashFlowForecast?.length) return "Live balance & forecast";

    const finalBalance =
      forecast.cashFlowForecast[forecast.cashFlowForecast.length - 1]
        ?.balance || 0;
    const currentBalance = data.find((d) => !d.predicted)?.balance ?? 0;
    const change = finalBalance - currentBalance;

    return `90-day projection: ${change >= 0 ? "+" : ""}GHS ${Math.abs(change).toFixed(0)}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Balance trend</CardTitle>
          <CardDescription>Loading live chart…</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Balance trend
              <Badge variant="secondary" className="text-xs">
                Live chart
              </Badge>
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              {getTrendIcon()}
              {getTrendText()}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="min-w-0 overflow-hidden">
        {cashFlowIssues?.hasIssues && (
          <div className="mb-4 p-3 border border-orange-200 dark:border-orange-900 rounded-lg bg-orange-50 dark:bg-orange-950/30">
            <div className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">
                {cashFlowIssues.issues.length} potential cash-flow issues
                detected
              </span>
            </div>
          </div>
        )}

        <FinancialLiveChart series={chartSeries} height={320} />

        {forecast && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Current</span>
              <div className="font-medium">
                GHS{" "}
                {data.find((d) => !d.predicted)?.balance.toFixed(0) ?? "0"}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Projected (90d)</span>
              <div className="font-medium">
                GHS{" "}
                {forecast.cashFlowForecast?.[
                  forecast.cashFlowForecast.length - 1
                ]?.balance?.toFixed(0) ?? "0"}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Avg confidence</span>
              <div className="font-medium">
                {forecast.cashFlowForecast?.length
                  ? `${(
                      (forecast.cashFlowForecast.reduce(
                        (sum: number, item: any) => sum + item.confidence,
                        0,
                      ) /
                        forecast.cashFlowForecast.length) *
                      100
                    ).toFixed(0)}%`
                  : "—"}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Risk</span>
              <div
                className={`font-medium ${
                  cashFlowIssues?.hasIssues
                    ? "text-orange-600"
                    : "text-green-600"
                }`}
              >
                {cashFlowIssues?.hasIssues ? "Medium" : "Low"}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
