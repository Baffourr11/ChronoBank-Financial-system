// Path: app/(dashboard)/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { DatasetSelector } from "@/components/dataset/DatasetSelector";
import { useDataset } from "@/lib/contexts/DatasetContext";
import CategoryBreakdown from "@/components/analytics/CategoryBreakdown";
import DashboardGreeting from "@/components/dashboard/DashboardGreeting";
import RecentTransactions from "@/components/dashboard/RecentTransactions";
import SmartInsights from "@/components/dashboard/SmartInsights";
import HealthScoreCard from "@/components/dashboard/HealthScoreCard";
import AutomationPanel from "@/components/dashboard/AutomationPanel";
import AutomationStatusCard from "@/components/dashboard/AutomationStatusCard";
import RecommendationsList from "@/components/dashboard/RecommendationsList";
import FinancialWalletCard from "@/components/dashboard/FinancialWalletCard";
import PageHeader from "@/components/layout/PageHeader";
import {
  TrendingUp,
  AlertTriangle,
  Target,
  Upload,
  Activity,
  Database,
  BarChart3,
  ChevronRight,
} from "lucide-react";
import {
  normalizeImportStats,
  type ImportDataQuality,
} from "@/lib/data/importStats";

interface DashboardStats {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  transactionCount: number;
  accountsCount: number;
  activeRules: number;
  dataQuality: ImportDataQuality;
}

export default function Dashboard() {
  const { selectedDataset } = useDataset();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [patterns, setPatterns] = useState<any>(null);
  const [forecast, setForecast] = useState<any>(null);
  const [intelligence, setIntelligence] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningPipeline, setIsRunningPipeline] = useState(false);
  const [walletRefreshKey, setWalletRefreshKey] = useState(0);

  // Add dataset ID to all API calls
  const datasetId = selectedDataset?._id;

  useEffect(() => {
    if (!datasetId) {
      setStats(null);
      setIntelligence(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setStats(null);
    setIntelligence(null);

    const fetchDashboardData = async () => {
      try {
        const [
          accountsResponse,
          transactionsResponse,
          rulesResponse,
          importStatsResponse,
          intelligenceResponse,
        ] = await Promise.all([
          fetch(`/api/accounts?datasetId=${datasetId}`, {
            signal: controller.signal,
          }),
          fetch(`/api/transactions?limit=100&datasetId=${datasetId}`, {
            signal: controller.signal,
          }),
          fetch(`/api/rules?datasetId=${datasetId}`, {
            signal: controller.signal,
          }),
          fetch(`/api/data/import?datasetId=${datasetId}`, {
            signal: controller.signal,
          }),
          fetch(`/api/intelligence/summary?datasetId=${datasetId}`, {
            signal: controller.signal,
          }),
        ]);

        if (controller.signal.aborted) return;

        if (
          accountsResponse.ok &&
          transactionsResponse.ok &&
          rulesResponse.ok &&
          importStatsResponse.ok
        ) {
          const accountsData = await accountsResponse.json();
          const transactionsData = await transactionsResponse.json();
          const rulesData = await rulesResponse.json();
          const importStats = await importStatsResponse.json();
          const dataQuality = normalizeImportStats(importStats.data);

          const accounts = accountsData.data?.accounts ?? [];
          const transactions = transactionsData.data?.transactions || [];
          const rules = Array.isArray(rulesData.data) ? rulesData.data : [];

          const totalBalance = accounts.reduce(
            (sum: number, acc: { balance: number }) => sum + acc.balance,
            0,
          );
          const currentMonth = new Date().getMonth();
          const currentYear = new Date().getFullYear();

          const monthlyTransactions = transactions.filter(
            (tx: { date: string }) => {
              const txDate = new Date(tx.date);
              return (
                txDate.getMonth() === currentMonth &&
                txDate.getFullYear() === currentYear
              );
            },
          );

          const monthlyIncome = monthlyTransactions
            .filter((tx: { type: string }) => tx.type === "income")
            .reduce(
              (sum: number, tx: { amount: number }) => sum + tx.amount,
              0,
            );

          const monthlyExpenses = monthlyTransactions
            .filter((tx: { type: string }) => tx.type === "expense")
            .reduce(
              (sum: number, tx: { amount: number }) => sum + tx.amount,
              0,
            );

          if (controller.signal.aborted) return;

          setStats({
            totalBalance,
            monthlyIncome,
            monthlyExpenses,
            transactionCount: transactions.length,
            accountsCount: accounts.length,
            activeRules: rules.filter(
              (rule: { isActive: boolean }) => rule.isActive,
            ).length,
            dataQuality,
          });
        }

        if (intelligenceResponse.ok && !controller.signal.aborted) {
          const intelligenceData = await intelligenceResponse.json();
          setIntelligence(intelligenceData.data);
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    fetchDashboardData();
    return () => controller.abort();
  }, [datasetId]);

  const handleDataImport = () => {
    // Navigate to data import page or open import modal
    window.location.href = "/data/import";
  };

  const handleRunAnalysis = async () => {
    if (!datasetId) return;
    setIsRunningPipeline(true);
    try {
      await fetch("/api/intelligence/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datasetId }),
      });
      const summaryRes = await fetch(
        `/api/intelligence/summary?datasetId=${datasetId}`,
      );
      if (summaryRes.ok) setIntelligence((await summaryRes.json()).data);
      setWalletRefreshKey((k) => k + 1);
    } catch (error) {
      console.error("Failed to run analysis:", error);
    } finally {
      setIsRunningPipeline(false);
    }
  };

  const handleDismissRecommendation = async (id: string) => {
    try {
      await fetch(`/api/recommendations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "dismissed" }),
      });
      setIntelligence((prev: any) =>
        prev
          ? {
              ...prev,
              recommendations: prev.recommendations.filter(
                (r: { id: string }) => r.id !== id,
              ),
            }
          : prev,
      );
    } catch (error) {
      console.error("Failed to dismiss recommendation:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="h-6 bg-muted rounded w-1/3 animate-pulse" />
              <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-80 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="h-6 bg-muted rounded w-1/3 animate-pulse" />
              <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-80 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!selectedDataset && (
        <DatasetSelector />
      )}

      {/* Show message if no dataset selected */}
      {!selectedDataset && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Database className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">
              Select a Dataset to Begin
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Choose a dataset from above to view analytics, patterns, and
              insights specific to that dataset. You can upload multiple
              datasets for different accounts or time periods.
            </p>
            <Button asChild>
              <a href="/data/import">Upload New Dataset</a>
            </Button>
          </CardContent>
        </Card>
      )}

      {selectedDataset && (
        <>
          <DashboardGreeting />
          <DatasetSelector variant="compact" />
          <PageHeader
            title="Dashboard"
            description="What happened, what's next, and what to do"
            actions={
              <Button variant="outline" onClick={handleDataImport}>
                <Upload className="w-4 h-4 mr-2" />
                Import Data
              </Button>
            }
          />

          {/* Data Quality Alert */}
          {stats && !stats.dataQuality.hasEnoughData && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>
                    Need more transaction data for accurate AI analysis.
                    Currently have{" "}
                    {stats.dataQuality.totalTransactions ??
                      stats.transactionCount}{" "}
                    transactions, need
                    at least{" "}
                    {
                      stats.dataQuality.recommendations
                        .recommendedMinTransactions
                    }{" "}
                    transactions.
                  </span>
                  <Button size="sm" onClick={handleDataImport}>
                    Import Historical Data
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <FinancialWalletCard
            key={walletRefreshKey}
            datasetId={datasetId}
            onRunAnalysis={handleRunAnalysis}
            isRunningAnalysis={isRunningPipeline}
          />

          {/* Intelligence row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <HealthScoreCard
              score={intelligence?.healthScore?.score ?? 0}
              label={intelligence?.healthScore?.label ?? "—"}
              loading={!intelligence}
            />
            <AutomationPanel
              activeRules={intelligence?.automation?.activeRules ?? stats?.activeRules ?? 0}
              unreadAlerts={intelligence?.automation?.unreadAlerts ?? 0}
              recentExecutions={intelligence?.automation?.recentExecutions ?? 0}
              warningLevel={intelligence?.automationEnhancements?.warningLevel ?? null}
              virtualReserve={intelligence?.automationEnhancements?.virtualReserve ?? null}
              loading={!intelligence}
            />
          </div>

          <AutomationStatusCard
            data={intelligence?.automationEnhancements ?? null}
            loading={!intelligence}
          />

          <RecommendationsList
            items={(intelligence?.recommendations ?? []).map((r: any) => ({
              id: r.id,
              recommendation: r.recommendation,
              priority: r.priority,
              status: r.status,
            }))}
            loading={!intelligence}
            onDismiss={handleDismissRecommendation}
          />

          {/* Key Metrics */}
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <Card className="min-w-0">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 min-w-0">
                    <TrendingUp className="w-4 h-4 text-chart-2 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground truncate">
                        Monthly Income
                      </p>
                      <p className="text-2xl font-bold tabular-nums truncate">
                        GHS {stats.monthlyIncome.toFixed(0)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="min-w-0">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 min-w-0">
                    <Activity className="w-4 h-4 text-chart-4 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground truncate">
                        Monthly Expenses
                      </p>
                      <p className="text-2xl font-bold tabular-nums truncate">
                        GHS {stats.monthlyExpenses.toFixed(0)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="min-w-0">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 min-w-0">
                    <Target className="w-4 h-4 text-chart-3 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground truncate">
                        Active Rules
                      </p>
                      <p className="text-2xl font-bold tabular-nums">{stats.activeRules}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <section className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Now — what happened
            </h2>
            <RecentTransactions datasetId={datasetId} />
            <CategoryBreakdown
              datasetId={datasetId}
              isLoading={isLoading}
              colorMode="vibrant"
            />
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Intelligence
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SmartInsights datasetId={datasetId} />
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Go deeper</CardTitle>
                  <CardDescription>
                    Forecasts and patterns live in Analytics
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2">
                  <Button variant="outline" className="justify-between h-auto py-3" asChild>
                    <Link href="/analytics/overview">
                      <span className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        Analytics & forecasts
                      </span>
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </Button>
                  <Button variant="outline" className="justify-between h-auto py-3" asChild>
                    <Link href="/rules">
                      <span className="flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Automation rules
                      </span>
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
