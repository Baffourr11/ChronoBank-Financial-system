"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChartCard } from "@/components/ui/chart-card";
import FinancialPieChart from "@/components/charts/FinancialPieChart";
import FinancialBarChart from "@/components/charts/FinancialBarChart";
import {
  aggregateByCategory,
  aggregateMonthly,
  type ChartColorMode,
} from "@/lib/charts/aggregateTransactions";
import {
  VIBRANT_EXPENSE_COLOR,
  VIBRANT_INCOME_COLOR,
} from "@/lib/charts/categoryColors";
import {
  PieChart,
  BarChart3,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CategoryBreakdownProps {
  datasetId?: string;
  isLoading?: boolean;
  colorMode?: ChartColorMode;
}

function SectionHeading({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-start gap-3 min-w-0 pb-1">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}

export default function CategoryBreakdown({
  datasetId,
  isLoading: parentLoading,
  colorMode = "theme",
}: CategoryBreakdownProps) {
  const [transactions, setTransactions] = useState<
    { type: string; category: string; amount: number; date: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!datasetId) {
      setLoading(false);
      setTransactions([]);
      return;
    }

    const fetchTx = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/transactions?limit=1000&datasetId=${datasetId}`,
        );
        if (res.ok) {
          const json = await res.json();
          const list =
            json.data?.transactions ?? json.data ?? json.transactions ?? [];
          setTransactions(
            list.map(
              (t: {
                type: string;
                category: string;
                amount: number;
                date: string;
              }) => ({
                type: t.type,
                category: t.category,
                amount: Number(t.amount),
                date: t.date,
              }),
            ),
          );
        }
      } catch (e) {
        console.error("Failed to load transactions for charts:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchTx();
  }, [datasetId]);

  const expenseSlices = useMemo(
    () => aggregateByCategory(transactions, "expense", 8, colorMode),
    [transactions, colorMode],
  );

  const incomeSlices = useMemo(
    () => aggregateByCategory(transactions, "income", 8, colorMode),
    [transactions, colorMode],
  );

  const monthlyBars = useMemo(
    () => aggregateMonthly(transactions, 6),
    [transactions],
  );

  const categoryBarData = useMemo(() => {
    return expenseSlices
      .filter((s) => s.name !== "Other")
      .slice(0, 6)
      .map((s) => ({ category: s.name, amount: s.value, fill: s.fill }));
  }, [expenseSlices]);

  const summary = useMemo(() => {
    let income = 0;
    let expenses = 0;
    for (const t of transactions) {
      const amt = Math.abs(t.amount);
      if (t.type === "income") income += amt;
      else if (t.type === "expense") expenses += amt;
    }
    return { income, expenses, net: income - expenses, count: transactions.length };
  }, [transactions]);

  const showLoading = parentLoading || loading;
  const chartHeight = 380;

  if (!datasetId) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center text-sm text-muted-foreground">
          Select a dataset to view spending breakdown charts.
        </CardContent>
      </Card>
    );
  }

  if (showLoading) {
    return (
      <div className="space-y-8 min-w-0">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="min-w-0 overflow-hidden">
              <CardContent className="p-6">
                <div className="h-80 bg-muted rounded-lg animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!transactions.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center">
          <Layers className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-sm font-medium">No chart data yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Import transactions to see category breakdowns and trends.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-10 min-w-0">
      {/* Summary strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm min-w-0">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
            <ArrowUpRight className="h-4 w-4 shrink-0" />
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Total income
            </span>
          </div>
          <p className="text-2xl font-bold tabular-nums truncate">
            GHS {summary.income.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm min-w-0">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 mb-1">
            <ArrowDownRight className="h-4 w-4 shrink-0" />
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Total expenses
            </span>
          </div>
          <p className="text-2xl font-bold tabular-nums truncate">
            GHS {summary.expenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Net · {summary.count} txns
            </span>
          </div>
          <p
            className={cn(
              "text-2xl font-bold tabular-nums truncate",
              summary.net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
            )}
          >
            {summary.net >= 0 ? "+" : ""}GHS{" "}
            {summary.net.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* Composition */}
      <section className="space-y-5 min-w-0">
        <SectionHeading
          icon={PieChart}
          title="Category composition"
          description="How income and spending split across categories"
        />
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <ChartCard
            icon={PieChart}
            iconClassName="bg-rose-500/10 text-rose-600 dark:text-rose-400"
            title="Expenses by category"
            description="Where your money goes"
            headerAction={
              <Badge variant="secondary" className="tabular-nums shrink-0">
                {expenseSlices.length} categories
              </Badge>
            }
          >
            <FinancialPieChart data={expenseSlices} height={chartHeight} />
          </ChartCard>

          <ChartCard
            icon={PieChart}
            iconClassName="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            title="Income by category"
            description="How earnings are distributed"
            headerAction={
              <Badge variant="secondary" className="tabular-nums shrink-0">
                {incomeSlices.length} sources
              </Badge>
            }
          >
            <FinancialPieChart data={incomeSlices} height={chartHeight} />
          </ChartCard>
        </div>
      </section>

      {/* Trends */}
      <section className="space-y-5 min-w-0">
        <SectionHeading
          icon={BarChart3}
          title="Spending & cash flow trends"
          description="Compare top categories and monthly inflows vs outflows"
        />
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <ChartCard
            icon={BarChart3}
            iconClassName="bg-violet-500/10 text-violet-600 dark:text-violet-400"
            title="Top expense categories"
            description="Largest spending areas ranked by amount"
          >
            <FinancialBarChart
              data={categoryBarData}
              xKey="category"
              bars={[{ key: "amount", label: "Expenses" }]}
              height={chartHeight}
              showCategoryLegend
            />
          </ChartCard>

          <ChartCard
            icon={TrendingUp}
            iconClassName="bg-sky-500/10 text-sky-600 dark:text-sky-400"
            title="Monthly income vs expenses"
            description="Last 6 months — cash in vs cash out"
          >
            <FinancialBarChart
              data={monthlyBars}
              xKey="month"
              bars={[
                {
                  key: "income",
                  label: "Income",
                  color:
                    colorMode === "vibrant"
                      ? VIBRANT_INCOME_COLOR
                      : "hsl(var(--chart-2))",
                },
                {
                  key: "expenses",
                  label: "Expenses",
                  color:
                    colorMode === "vibrant"
                      ? VIBRANT_EXPENSE_COLOR
                      : "hsl(var(--chart-4))",
                },
              ]}
              height={chartHeight}
            />
          </ChartCard>
        </div>
      </section>
    </div>
  );
}
