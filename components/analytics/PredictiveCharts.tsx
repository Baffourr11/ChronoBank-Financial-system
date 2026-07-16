"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TrendingUp, TrendingDown, AlertTriangle, Info } from "lucide-react";
import FinancialLiveChart, {
  type LiveChartSeries,
} from "@/components/charts/FinancialLiveChart";
import { getChartTheme } from "@/lib/charts/theme";

interface ForecastData {
  date: string;
  predicted: number;
  minRange: number;
  maxRange: number;
  actual?: number;
}

interface CashFlowData {
  date: string;
  income: number;
  expenses: number;
  netCashFlow: number;
  balance: number;
  confidence: number;
}

interface PredictiveChartsProps {
  forecasts: ForecastData[];
  cashFlowData: CashFlowData[];
  isLoading?: boolean;
}

export default function PredictiveCharts({
  forecasts,
  cashFlowData,
  isLoading,
}: PredictiveChartsProps) {
  const theme = typeof window !== "undefined" ? getChartTheme() : null;

  const chartForecasts = useMemo(() => normalizeSpendingForecasts(forecasts), [forecasts]);

  const spendingSeries = useMemo((): LiveChartSeries[] => {
    if (!chartForecasts.length) return [];
    const series: LiveChartSeries[] = [
      {
        id: "predicted",
        name: "Predicted",
        type: "area",
        color: theme?.chart1,
        data: chartForecasts.map((f) => ({
          time: f.date,
          value: f.predicted,
        })),
      },
      {
        id: "minRange",
        name: "Min range",
        type: "line",
        color: theme?.chart3,
        data: chartForecasts.map((f) => ({ time: f.date, value: f.minRange })),
      },
      {
        id: "maxRange",
        name: "Max range",
        type: "line",
        color: theme?.chart2,
        data: chartForecasts.map((f) => ({ time: f.date, value: f.maxRange })),
      },
    ];
    if (chartForecasts.some((f) => f.actual != null)) {
      series.push({
        id: "actual",
        name: "Actual",
        type: "line",
        color: theme?.chart5,
        data: chartForecasts
          .filter((f) => f.actual != null)
          .map((f) => ({ time: f.date, value: f.actual! })),
      });
    }
    return series;
  }, [chartForecasts, theme]);

  const cashFlowSeries = useMemo((): LiveChartSeries[] => {
    if (!cashFlowData.length) return [];
    return [
      {
        id: "balance",
        name: "Balance",
        type: "area",
        color: theme?.chart2,
        data: cashFlowData.map((d) => ({ time: d.date, value: d.balance })),
      },
      {
        id: "income",
        name: "Income",
        type: "line",
        color: theme?.chart1,
        data: cashFlowData.map((d) => ({ time: d.date, value: d.income })),
      },
      {
        id: "expenses",
        name: "Expenses",
        type: "line",
        color: theme?.chart4,
        data: cashFlowData.map((d) => ({ time: d.date, value: d.expenses })),
      },
      {
        id: "netCashFlow",
        name: "Net cash flow",
        type: "line",
        color: theme?.chart3,
        data: cashFlowData.map((d) => ({
          time: d.date,
          value: d.netCashFlow,
        })),
      },
    ];
  }, [cashFlowData, theme]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Spending Forecast</CardTitle>
            <CardDescription>
              AI-powered predictions for your spending patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 bg-muted rounded animate-pulse" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cash Flow Projection</CardTitle>
            <CardDescription>
              90-day cash flow analysis with confidence intervals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 bg-muted rounded animate-pulse" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!cashFlowData.length && !chartForecasts.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No forecast data yet. Run analysis from the dashboard after importing
          transactions.
        </CardContent>
      </Card>
    );
  }

  const totalPredicted = chartForecasts.reduce(
    (sum, f) => sum + (f.predicted ?? 0),
    0,
  );
  const avgConfidence =
    cashFlowData.length > 0
      ? cashFlowData.reduce((sum, f) => sum + (f.confidence ?? 0), 0) /
        cashFlowData.length
      : 0;
  const negativeCashFlowDays = cashFlowData.filter(
    (d) => d.netCashFlow < 0,
  ).length;
  const lowestBalance =
    cashFlowData.length > 0
      ? Math.min(...cashFlowData.map((d) => d.balance))
      : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="min-w-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 min-w-0">
              <TrendingUp className="w-4 h-4 text-chart-1 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground truncate">90-Day Forecast</p>
                <p className="text-lg font-semibold tabular-nums truncate">
                  GHS {totalPredicted.toFixed(0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 min-w-0">
              <Info className="w-4 h-4 text-chart-2 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground truncate">Avg Confidence</p>
                <p className="text-lg font-semibold tabular-nums truncate">
                  {(avgConfidence * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 min-w-0">
              {negativeCashFlowDays > 0 ? (
                <AlertTriangle className="w-4 h-4 text-chart-4 shrink-0" />
              ) : (
                <TrendingUp className="w-4 h-4 text-chart-1 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground truncate">Negative Days</p>
                <p className="text-lg font-semibold tabular-nums">{negativeCashFlowDays}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 min-w-0">
              {lowestBalance < 0 ? (
                <TrendingDown className="w-4 h-4 text-chart-4 shrink-0" />
              ) : (
                <TrendingUp className="w-4 h-4 text-chart-1 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground truncate">Lowest Balance</p>
                <p className="text-lg font-semibold tabular-nums truncate">
                  GHS {lowestBalance.toFixed(0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {chartForecasts.length > 0 && (
        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>Spending Forecast</CardTitle>
            <CardDescription>
              Live chart — predicted spending with confidence range
            </CardDescription>
          </CardHeader>
          <CardContent className="min-w-0 overflow-hidden">
            {spendingSeries.length > 0 ? (
              <FinancialLiveChart series={spendingSeries} height={300} />
            ) : (
              <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                Add expense transactions to generate a spending forecast.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {cashFlowData.length > 0 && (
        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>Cash Flow Projection</CardTitle>
            <CardDescription>
              Live chart — income, expenses, and balance over 90 days
            </CardDescription>
          </CardHeader>
          <CardContent className="min-w-0 overflow-hidden">
            <FinancialLiveChart series={cashFlowSeries} height={400} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Prediction Confidence Analysis</CardTitle>
          <CardDescription>
            Understanding the reliability of our AI predictions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">High Confidence Period</h4>
                <p className="text-sm text-muted-foreground">
                  First 30 days have {(avgConfidence * 100).toFixed(0)}% average
                  confidence
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-chart-1">
                  Reliable
                </div>
                <div className="text-xs text-muted-foreground">
                  Based on recent patterns
                </div>
              </div>
            </div>

            {negativeCashFlowDays > 0 && (
              <div className="flex items-center justify-between p-4 border border-orange-200 rounded-lg bg-orange-50 dark:bg-orange-950/30 dark:border-orange-900">
                <div>
                  <h4 className="font-medium text-orange-800 dark:text-orange-200">
                    Cash Flow Concern
                  </h4>
                  <p className="text-sm text-orange-600 dark:text-orange-300">
                    {negativeCashFlowDays} days with negative cash flow projected
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-orange-800 dark:text-orange-200">
                    Action Required
                  </div>
                  <div className="text-xs text-orange-600 dark:text-orange-300">
                    Review spending patterns
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Seasonal Patterns</h4>
                <p className="text-sm text-muted-foreground">
                  AI has detected seasonal spending patterns in your data
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-chart-2">
                  Accounted For
                </div>
                <div className="text-xs text-muted-foreground">
                  Improves accuracy
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** Map API daily series or legacy period summaries into chart-ready points */
function normalizeSpendingForecasts(raw: ForecastData[]): ForecastData[] {
  if (!raw?.length) return [];

  const first = raw[0] as ForecastData & {
    period?: string;
    predictedAmount?: number;
    range?: { min: number; max: number };
  };

  if (first.date && typeof first.predicted === "number") {
    return raw;
  }

  if (first.period && typeof first.predictedAmount === "number") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const offsets = [7, 30, 90];
    return raw.map((item, index) => {
      const row = item as typeof first;
      const d = new Date(today);
      d.setDate(today.getDate() + (offsets[index] ?? (index + 1) * 30));
      return {
        date: d.toISOString().split("T")[0],
        predicted: row.predictedAmount ?? 0,
        minRange: row.range?.min ?? 0,
        maxRange: row.range?.max ?? 0,
      };
    });
  }

  return [];
}
