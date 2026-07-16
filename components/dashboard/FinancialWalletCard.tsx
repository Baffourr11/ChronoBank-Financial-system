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
import { Progress } from "@/components/ui/progress";
import {
  Wallet,
  Lock,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Target,
  Bell,
  Brain,
} from "lucide-react";
import type { WalletState, RiskLevel } from "@/lib/finance/computeWalletState";
import { formatBalanceAsOf } from "@/lib/finance/balanceContext";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FinancialWalletCardProps {
  datasetId?: string;
  onRunAnalysis?: () => void;
  isRunningAnalysis?: boolean;
}

function formatGhs(value: number) {
  return `GHS ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function riskBadge(level: RiskLevel) {
  switch (level) {
    case "high":
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="w-3 h-3" />
          High risk
        </Badge>
      );
    case "medium":
      return (
        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1">
          <AlertTriangle className="w-3 h-3" />
          Caution
        </Badge>
      );
    case "low":
      return (
        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1">
          <TrendingUp className="w-3 h-3" />
          Stable
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-muted-foreground">
          No forecast yet
        </Badge>
      );
  }
}

export default function FinancialWalletCard({
  datasetId,
  onRunAnalysis,
  isRunningAnalysis = false,
}: FinancialWalletCardProps) {
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!datasetId) {
      setWallet(null);
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/finance/state?datasetId=${datasetId}`);
        if (res.ok) {
          const json = await res.json();
          setWallet(json.data?.wallet ?? null);
        }
      } catch (e) {
        console.error("Failed to load wallet state:", e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [datasetId]);

  if (!datasetId) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Select a dataset to view your financial wallet state.
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wallet className="w-5 h-5" />
            Financial wallet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-40 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (!wallet) return null;

  const reservedPct =
    wallet.currentBalance > 0
      ? Math.min(100, (wallet.reservedFunds / wallet.currentBalance) * 100)
      : 0;

  const ctx = wallet.balanceContext ?? {
    balanceAsOf: null,
    datasetRangeStart: null,
    datasetRangeEnd: null,
    yearToDateIncome: 0,
    yearToDateExpenses: 0,
    yearToDateNet: 0,
    isDataStale: false,
    daysSinceLastTransaction: null,
  };
  const currentYear = new Date().getFullYear();
  const monthLabel = new Date().toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-card via-card to-primary/5">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="w-5 h-5 text-primary" />
              Financial wallet
            </CardTitle>
            <CardDescription>
              Live state — transactions, budgets, rules &amp; forecasts
            </CardDescription>
          </div>
          {riskBadge(wallet.riskLevel)}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {ctx.isDataStale && (
          <Alert className="border-amber-500/40 bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-sm">
              Your latest transaction was{" "}
              <strong>{ctx.daysSinceLastTransaction} days ago</strong>. Import
              newer data so this balance reflects your business today.
            </AlertDescription>
          </Alert>
        )}

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-lg border bg-background/60 p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Ledger balance
            </p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold mt-1 tabular-nums break-words">
              {formatGhs(wallet.currentBalance)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              As of {formatBalanceAsOf(ctx.balanceAsOf)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              All imported income &amp; expenses in this dataset
            </p>
          </div>
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Available to spend
            </p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold mt-1 tabular-nums text-primary break-words">
              {formatGhs(wallet.availableBalance)}
            </p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              After {monthLabel} budget reservations
            </p>
          </div>
        </section>

        <section className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            This year ({currentYear}) — cash flow
          </p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-[10px] text-muted-foreground">Income</p>
              <p className="text-sm font-semibold tabular-nums text-chart-2">
                {formatGhs(ctx.yearToDateIncome)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Expenses</p>
              <p className="text-sm font-semibold tabular-nums text-chart-4">
                {formatGhs(ctx.yearToDateExpenses)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Net</p>
              <p
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  ctx.yearToDateNet >= 0 ? "text-chart-2" : "text-chart-4",
                )}
              >
                {formatGhs(ctx.yearToDateNet)}
              </p>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Year-to-date totals help you set budgets; ledger balance includes
            your full imported history.
          </p>
        </section>

        {/* AUTOMATION */}
        <section className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Automation impact
          </p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-md border p-3">
              <Target className="w-4 h-4 mx-auto text-chart-3 mb-1" />
              <p className="text-lg font-semibold">{wallet.automation.activeRules}</p>
              <p className="text-[10px] text-muted-foreground">Active rules</p>
            </div>
            <div className="rounded-md border p-3">
              <Bell className="w-4 h-4 mx-auto text-chart-4 mb-1" />
              <p className="text-lg font-semibold">
                {wallet.automation.unreadAlerts}
              </p>
              <p className="text-[10px] text-muted-foreground">Alerts</p>
            </div>
            <div className="rounded-md border p-3">
              <TrendingDown className="w-4 h-4 mx-auto text-chart-2 mb-1" />
              <p className="text-lg font-semibold">
                {wallet.automation.recentExecutions}
              </p>
              <p className="text-[10px] text-muted-foreground">Runs (7d)</p>
            </div>
          </div>

          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" />
                Reserved (budgets)
              </span>
              <span className="font-medium tabular-nums">
                {formatGhs(wallet.reservedFunds)}
              </span>
            </div>
            <Progress value={reservedPct} className="h-2" />
            {wallet.budgetAllocations.length > 0 ? (
              <ul className="text-xs text-muted-foreground space-y-1 pt-1">
                {wallet.budgetAllocations.map((b) => (
                  <li key={b.category} className="flex justify-between">
                    <span>{b.category}</span>
                    <span>{formatGhs(b.remaining)} left</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">
                No active budget reservations — all balance is available.
              </p>
            )}
          </div>
        </section>

        {/* PREDICTION */}
        <section className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Projected balance
            </p>
            {onRunAnalysis && (
              <Button
                size="sm"
                onClick={onRunAnalysis}
                disabled={isRunningAnalysis}
                className="shrink-0"
              >
                <Brain className="w-4 h-4 mr-1.5" />
                {isRunningAnalysis ? "Running…" : "Run Analysis"}
              </Button>
            )}
          </div>

          <div className="rounded-md border border-dashed min-h-[5.5rem]">
            {wallet.hasForecast ? (
            <div className="grid grid-cols-3 gap-3 p-4">
              {(
                [
                  { label: "7 days", value: wallet.projections.days7 },
                  { label: "30 days", value: wallet.projections.days30 },
                  { label: "90 days", value: wallet.projections.days90 },
                ] as const
              ).map(({ label, value }) => (
                <div
                  key={label}
                  className={cn(
                    "rounded-md border bg-background/60 p-3 text-center",
                    value != null && value < wallet.availableBalance
                      ? "border-amber-500/40 bg-amber-500/5"
                      : "",
                  )}
                >
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                  <p className="text-xs sm:text-sm font-semibold tabular-nums mt-0.5 truncate">
                    {value != null ? formatGhs(value) : "—"}
                  </p>
                </div>
              ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground p-4">
                Run analysis to generate cash-flow projections.
              </p>
            )}
          </div>
          {wallet.lowestProjected30d != null && wallet.hasForecast && (
            <p className="text-xs text-muted-foreground">
              Lowest projected (30d window):{" "}
              <span className="font-medium text-foreground">
                {formatGhs(wallet.lowestProjected30d)}
              </span>
            </p>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
