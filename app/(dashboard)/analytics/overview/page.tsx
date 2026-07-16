// Path: app/(dashboard)/analytics/overview/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatasetSelector } from "@/components/dataset/DatasetSelector";
import { useDataset } from "@/lib/contexts/DatasetContext";
import PredictiveCharts from "@/components/analytics/PredictiveCharts";
import PatternHeatmap from "@/components/analytics/PatternHeatmap";
import CategoryBreakdown from "@/components/analytics/CategoryBreakdown";
import BalanceTrend from "@/components/dashboard/BalanceTrend";
import PageHeader from "@/components/layout/PageHeader";
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Activity,
  RefreshCw,
  BarChart3,
  Database,
  Download,
} from "lucide-react";
import { downloadDatasetTransactionsCsv } from "@/lib/export/downloadTransactions";

interface AnalyticsData {
  patterns: any;
  forecast: any;
  anomalies: any;
  ghanaianPatterns: any;
  metadata: any;
}

export default function AnalyticsOverviewPage() {
  const { selectedDataset } = useDataset();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("forecast");

  const datasetId = selectedDataset?._id;
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  useEffect(() => {
    if (datasetId) {
      fetchAnalyticsData();
    } else {
      setIsLoading(false);
    }
  }, [datasetId]);

  const fetchAnalyticsData = async () => {
    if (!datasetId) return;

    try {
      setIsLoading(true);

      // Fetch all analytics data with dataset ID
      const [patternsResponse, forecastResponse] = await Promise.all([
        fetch(`/api/analytics/patterns?datasetId=${datasetId}`),
        fetch(`/api/analytics/forecast?days=90&datasetId=${datasetId}`),
      ]);

      if (patternsResponse.ok && forecastResponse.ok) {
        const patternsData = await patternsResponse.json();
        const forecastData = await forecastResponse.json();

        setData({
          patterns: patternsData.data,
          forecast: forecastData.data,
          anomalies: patternsData.data.anomalies,
          ghanaianPatterns: patternsData.data.ghanaianPatterns,
          metadata: {
            ...patternsData.data.analysisPeriod,
            ...forecastData.data.metadata,
          },
        });

        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error("Failed to fetch analytics data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCsv = async () => {
    if (!datasetId) return;
    setIsExporting(true);
    setExportMessage(null);
    try {
      const count = await downloadDatasetTransactionsCsv(
        datasetId,
        selectedDataset?.name,
      );
      setExportMessage(`Exported ${count} transactions.`);
    } catch (err) {
      setExportMessage(
        err instanceof Error ? err.message : "Export failed",
      );
    } finally {
      setIsExporting(false);
    }
  };

  const runFullAnalysis = async () => {
    if (!datasetId) return;
    setIsLoading(true);
    try {
      await fetch("/api/intelligence/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datasetId }),
      });
      await fetchAnalyticsData();
    } finally {
      setIsLoading(false);
    }
  };

  const getInsightCount = () => {
    if (!data) return 0;

    let count = 0;
    if (data.patterns?.patterns) count += data.patterns.patterns.length;
    if (data.anomalies) count += data.anomalies.length;
    if (data.forecast?.cashFlowIssues?.hasIssues)
      count += data.forecast.cashFlowIssues.issues.length;

    return count;
  };

  const getRiskLevel = () => {
    if (!data?.forecast?.cashFlowIssues) return "low";
    if (data.forecast.cashFlowIssues.hasIssues) return "high";
    return "medium";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Analytics Overview</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2 animate-pulse" />
                <div className="h-8 bg-muted rounded w-1/2 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="h-80 bg-muted rounded animate-pulse" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dataset Selector */}
      <DatasetSelector />

      {/* Show message if no dataset selected */}
      {!selectedDataset ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Database className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">
              Select a Dataset to View Analytics
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Analytics are computed for specific datasets. Select a dataset
              above to view AI-powered insights and forecasts.
            </p>
            <Button asChild>
              <a href="/data/import">Upload New Dataset</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <PageHeader
            title="Analytics Overview"
            description="Forecasts, patterns, and charts for your dataset"
            actions={
              <>
                <Button onClick={runFullAnalysis} disabled={isLoading}>
                  <Brain className="w-4 h-4 mr-2" />
                  Run analysis
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExportCsv}
                  disabled={isExporting || isLoading}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {isExporting ? "Exporting…" : "Export CSV"}
                </Button>
                <Button variant="outline" onClick={fetchAnalyticsData} disabled={isLoading}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </>
            }
          />

          {exportMessage && (
            <Alert>
              <AlertDescription>{exportMessage}</AlertDescription>
            </Alert>
          )}

          {/* Data Quality Alert */}
          {data && !data.patterns?.patterns.length && (
            <Alert>
              <Brain className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>
                    Need more transaction data for accurate pattern analysis.
                    Currently have {data.metadata?.totalTransactions || 0}{" "}
                    transactions.
                  </span>
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/data/import">Import data</Link>
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Key Metrics */}
          {data && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="min-w-0">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 min-w-0">
                    <BarChart3 className="w-4 h-4 text-chart-1 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground truncate">
                        Total Insights
                      </p>
                      <p className="text-2xl font-bold tabular-nums truncate">{getInsightCount()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="min-w-0">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 min-w-0">
                    <TrendingUp className="w-4 h-4 text-chart-2 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground truncate">
                        Forecast Days
                      </p>
                      <p className="text-2xl font-bold tabular-nums truncate">
                        {data.metadata?.forecastDays || 90}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="min-w-0">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 min-w-0">
                    <Activity className="w-4 h-4 text-chart-3 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground truncate">
                        Data Points
                      </p>
                      <p className="text-2xl font-bold tabular-nums truncate">
                        {data.metadata?.dataPoints || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="min-w-0">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertTriangle className="w-4 h-4 text-chart-4 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground truncate">
                        Risk Level
                      </p>
                      <p className="text-2xl font-bold capitalize tabular-nums truncate">
                        {getRiskLevel()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Analytics Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6 min-w-0"
          >
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 min-w-0">
              <TabsTrigger value="forecast">Forecast</TabsTrigger>
              <TabsTrigger value="breakdown">Charts</TabsTrigger>
              <TabsTrigger value="patterns">Patterns</TabsTrigger>
              <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
            </TabsList>

            <TabsContent value="forecast" className="space-y-6">
              {data?.forecast ? (
                <>
                  <PredictiveCharts
                    forecasts={data.forecast.spendingForecasts || []}
                    cashFlowData={data.forecast.cashFlowForecast || []}
                  />

                  {data.forecast.cashFlowIssues?.hasIssues && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-2">
                          <p>
                            <strong>Cash Flow Issues Detected:</strong>
                          </p>
                          <ul className="list-disc list-inside space-y-1">
                            {data.forecast.cashFlowIssues.issues.map(
                              (issue: any, index: number) => (
                                <li key={index}>
                                  {issue.date}: {issue.description} (Projected
                                  balance: GHS{" "}
                                  {issue.projectedBalance.toFixed(0)})
                                </li>
                              ),
                            )}
                          </ul>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-sm text-muted-foreground">
                    No forecast yet. Click <strong>Run analysis</strong> above.
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="breakdown" className="space-y-10 min-w-0">
              <section className="space-y-4 min-w-0">
                <div className="flex items-start gap-3 pb-1">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold tracking-tight">
                      Balance trend
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Historical balance with 90-day forecast
                    </p>
                  </div>
                </div>
                <BalanceTrend datasetId={datasetId} />
              </section>

              <div
                className="border-t border-border/60"
                aria-hidden
              />

              <CategoryBreakdown
                datasetId={datasetId}
                isLoading={isLoading}
                colorMode="vibrant"
              />
            </TabsContent>

            <TabsContent value="patterns" className="space-y-6">
              {data?.patterns && (
                <PatternHeatmap
                  patterns={data.patterns.patterns || []}
                  anomalies={data.patterns.anomalies || []}
                />
              )}
            </TabsContent>

            <TabsContent value="anomalies" className="space-y-6">
              {data?.patterns?.anomalies &&
              data.patterns.anomalies.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      Detected Anomalies
                    </CardTitle>
                    <CardDescription>
                      Unusual transactions that deviate from your normal
                      patterns
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {data.patterns.anomalies.map(
                        (anomaly: any, index: number) => (
                          <div key={index} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h4 className="font-medium">
                                  {anomaly.description}
                                </h4>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Expected: GHS{" "}
                                  {anomaly.expectedValue.toFixed(2)} | Actual:
                                  GHS {anomaly.actualValue.toFixed(2)}
                                </p>
                              </div>
                              <Badge
                                variant={
                                  anomaly.severity === "high"
                                    ? "destructive"
                                    : "secondary"
                                }
                              >
                                {anomaly.severity}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>
                                Confidence:{" "}
                                {(anomaly.confidence * 100).toFixed(0)}%
                              </span>
                              <span>Type: {anomaly.type}</span>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Brain className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No Anomalies Detected
                    </h3>
                    <p className="text-muted-foreground text-center">
                      Your spending patterns appear normal and consistent
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="insights" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Ghanaian Patterns */}
                {data?.ghanaianPatterns && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Ghanaian Market Insights</CardTitle>
                      <CardDescription>
                        Patterns specific to Ghana's informal sector
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            Payday Spending Pattern
                          </span>
                          <Badge
                            variant={
                              data.ghanaianPatterns.paydaySpending
                                ? "default"
                                : "secondary"
                            }
                          >
                            {data.ghanaianPatterns.paydaySpending
                              ? "Detected"
                              : "Not Detected"}
                          </Badge>
                        </div>

                        {data.ghanaianPatterns.seasonalFestivals?.length >
                          0 && (
                          <div>
                            <span className="text-sm font-medium">
                              Seasonal Festival Spending:
                            </span>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {data.ghanaianPatterns.seasonalFestivals.map(
                                (festival: string, index: number) => (
                                  <Badge
                                    key={index}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {festival}
                                  </Badge>
                                ),
                              )}
                            </div>
                          </div>
                        )}

                        {data.ghanaianPatterns.informalSectorPatterns?.length >
                          0 && (
                          <div>
                            <span className="text-sm font-medium">
                              Informal Sector Patterns:
                            </span>
                            <div className="mt-2 space-y-1">
                              {data.ghanaianPatterns.informalSectorPatterns.map(
                                (pattern: string, index: number) => (
                                  <div
                                    key={index}
                                    className="text-xs text-muted-foreground"
                                  >
                                    {pattern}
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Data Summary */}
                {data?.metadata && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Data Summary</CardTitle>
                      <CardDescription>
                        Overview of your financial data analysis
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Analysis Period
                            </p>
                            <p className="font-medium">
                              {data.metadata.lookbackDays} days
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Total Transactions
                            </p>
                            <p className="font-medium">
                              {data.metadata.totalTransactions}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Expense Transactions
                            </p>
                            <p className="font-medium">
                              {data.metadata.expenseTransactions}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Income Transactions
                            </p>
                            <p className="font-medium">
                              {data.metadata.incomeTransactions}
                            </p>
                          </div>
                        </div>

                        {lastUpdated && (
                          <div className="text-xs text-muted-foreground pt-4 border-t">
                            Last updated: {lastUpdated.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>

        </>
      )}
    </div>
  );
}
