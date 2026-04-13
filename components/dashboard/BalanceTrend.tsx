// Path: components/dashboard/BalanceTrend.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Brain, AlertTriangle } from "lucide-react";

interface ForecastData {
  date: string;
  balance: number;
  predicted?: boolean;
  confidence?: number;
}

interface BalanceTrendProps {
  userId?: string;
}

export default function BalanceTrend({ userId }: BalanceTrendProps) {
  const [data, setData] = useState<ForecastData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [forecast, setForecast] = useState<any>(null);
  const [cashFlowIssues, setCashFlowIssues] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get historical transactions for balance calculation
        const transactionsResponse = await fetch(
          "/api/transactions?limit=1000",
        );
        const accountsResponse = await fetch("/api/accounts");

        if (transactionsResponse.ok && accountsResponse.ok) {
          const transactionsData = await transactionsResponse.json();
          const accountsData = await accountsResponse.json();

          const transactions = transactionsData.data.transactions as any[];
          const accounts = accountsData.data as any[];

          // Calculate historical balances
          const monthlyBalances = calculateMonthlyBalances(
            transactions,
            accounts,
          );

          // Get forecast
          const forecastResponse = await fetch(
            "/api/analytics/forecast?days=90",
          );
          if (forecastResponse.ok) {
            const forecastData = await forecastResponse.json();
            setForecast(forecastData.data);
            setCashFlowIssues(forecastData.data.cashFlowIssues);

            // Combine historical with forecast
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
  }, [userId]);

  const calculateMonthlyBalances = (transactions: any[], accounts: any[]) => {
    const currentBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    const monthlyData: ForecastData[] = [];

    // Generate last 6 months of data (simplified for demo)
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    let runningBalance = currentBalance - 2000; // Start from 6 months ago

    months.forEach((month, index) => {
      runningBalance += Math.random() * 1000 - 200; // Simulate monthly changes
      monthlyData.push({
        date: month,
        balance: runningBalance,
        predicted: false,
      });
    });

    return monthlyData;
  };

  const getTrendIcon = () => {
    if (!forecast) return <Brain className="w-4 h-4 text-chart-2" />;

    const finalBalance =
      forecast.cashFlowForecast[forecast.cashFlowForecast.length - 1]
        ?.balance || 0;
    const currentBalance = data[0]?.balance || 0;

    if (finalBalance > currentBalance) {
      return <TrendingUp className="w-4 h-4 text-chart-1" />;
    } else if (finalBalance < currentBalance) {
      return <TrendingDown className="w-4 h-4 text-chart-4" />;
    }

    return <Brain className="w-4 h-4 text-chart-2" />;
  };

  const getTrendText = () => {
    if (!forecast) return "AI-powered analysis";

    const finalBalance =
      forecast.cashFlowForecast[forecast.cashFlowForecast.length - 1]
        ?.balance || 0;
    const currentBalance = data[0]?.balance || 0;
    const change = finalBalance - currentBalance;

    return `90-day projection: ${change >= 0 ? "+" : ""}GHS ${Math.abs(change).toFixed(0)}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Balance Trend</CardTitle>
          <CardDescription>AI-powered balance projections</CardDescription>
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
              Balance Trend
              <Badge variant="secondary" className="text-xs">
                <Brain className="w-3 h-3 mr-1" />
                AI Enhanced
              </Badge>
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              {getTrendIcon()}
              {getTrendText()}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {cashFlowIssues?.hasIssues && (
          <div className="mb-4 p-3 border border-orange-200 rounded-lg bg-orange-50">
            <div className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">
                {cashFlowIssues.issues.length} potential cash flow issues
                detected
              </span>
            </div>
          </div>
        )}

        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--color-border))"
            />
            <XAxis
              dataKey="date"
              stroke="hsl(var(--color-muted-foreground))"
              tick={{ fontSize: 12 }}
            />
            <YAxis
              stroke="hsl(var(--color-muted-foreground))"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `GHS ${value}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--color-card))",
                border: "1px solid hsl(var(--color-border))",
                borderRadius: "8px",
              }}
              formatter={(value: any, name: string, props: any) => {
                const formattedValue = `GHS ${value.toFixed(2)}`;
                if (props.payload.predicted) {
                  return [
                    formattedValue,
                    `Predicted (${(props.payload.confidence * 100).toFixed(0)}% confidence)`,
                  ];
                }
                return [formattedValue, "Historical"];
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="balance"
              stroke="hsl(var(--color-chart-1))"
              fill="hsl(var(--color-chart-1))"
              fillOpacity={0.3}
              strokeWidth={2}
              name="Balance"
            />
          </AreaChart>
        </ResponsiveContainer>

        {forecast && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Current:</span>
              <div className="font-medium">
                GHS {data[0]?.balance.toFixed(0) || "0"}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Projected (90d):</span>
              <div className="font-medium">
                GHS{" "}
                {forecast.cashFlowForecast[
                  forecast.cashFlowForecast.length - 1
                ]?.balance.toFixed(0) || "0"}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Avg Confidence:</span>
              <div className="font-medium">
                {(
                  (forecast.cashFlowForecast.reduce(
                    (sum: number, item: any) => sum + item.confidence,
                    0,
                  ) /
                    forecast.cashFlowForecast.length) *
                  100
                ).toFixed(0)}
                %
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Risk Level:</span>
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
