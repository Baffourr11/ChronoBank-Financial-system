"use client";

import { useEffect, useState } from "react";
import { DatasetSelector } from "@/components/dataset/DatasetSelector";
import { useDataset } from "@/lib/contexts/DatasetContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { formatBalanceAsOf } from "@/lib/finance/balanceContext";
import type { WalletState } from "@/lib/finance/computeWalletState";

interface BudgetRow {
  id: string;
  category: string;
  limit_amount: number;
  period: string;
  alert_threshold: number;
  spent: number;
  percentUsed: number;
  remaining: number;
  overBudget: boolean;
}

export default function BudgetsPage() {
  const { selectedDataset } = useDataset();
  const datasetId = selectedDataset?._id;
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [limitAmount, setLimitAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [walletSnapshot, setWalletSnapshot] = useState<WalletState | null>(
    null,
  );
  const [budgetSuggestions, setBudgetSuggestions] = useState<
    { id: string; recommendation: string; priority: string }[]
  >([]);

  const loadBudgets = async () => {
    if (!datasetId) {
      setBudgets([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/budgets?datasetId=${datasetId}`);
      if (res.ok) {
        const data = await res.json();
        setBudgets(data.data?.budgets ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBudgets();
  }, [datasetId]);

  useEffect(() => {
    if (!datasetId) {
      setWalletSnapshot(null);
      setBudgetSuggestions([]);
      return;
    }
    fetch(`/api/finance/state?datasetId=${datasetId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => setWalletSnapshot(json?.data?.wallet ?? null))
      .catch(() => setWalletSnapshot(null));

    fetch(`/api/recommendations?datasetId=${datasetId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const items = (json?.data?.recommendations ?? []).filter(
          (r: { source: string }) => r.source === "budget_automation",
        );
        setBudgetSuggestions(items);
      })
      .catch(() => setBudgetSuggestions([]));
  }, [datasetId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!datasetId || !category || !limitAmount) return;
    setSaving(true);
    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          limitAmount,
          datasetId,
        }),
      });
      if (res.ok) {
        setCategory("");
        setLimitAmount("");
        await loadBudgets();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/budgets/${id}`, { method: "DELETE" });
    await loadBudgets();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budgets"
        description="Track spending limits by category for your dataset"
      />
      <DatasetSelector />

      {walletSnapshot && datasetId && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex flex-wrap gap-6 text-sm">
            <div>
              <p className="text-muted-foreground">Ledger balance (dataset)</p>
              <p className="font-semibold tabular-nums">
                GHS{" "}
                {walletSnapshot.currentBalance.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}
              </p>
              <p className="text-xs text-muted-foreground">
                As of{" "}
                {formatBalanceAsOf(walletSnapshot.balanceContext.balanceAsOf)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Available to spend</p>
              <p className="font-semibold tabular-nums text-primary">
                GHS{" "}
                {walletSnapshot.availableBalance.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {new Date().getFullYear()} net (YTD)
              </p>
              <p className="font-semibold tabular-nums">
                GHS{" "}
                {walletSnapshot.balanceContext.yearToDateNet.toLocaleString(
                  undefined,
                  { maximumFractionDigits: 0 },
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                Use limits below for this month&apos;s spending
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!datasetId ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Select a dataset to manage budgets
          </CardContent>
        </Card>
      ) : (
        <>
          {budgetSuggestions.length > 0 && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader>
                <CardTitle className="text-base">Smart budget suggestions</CardTitle>
                <CardDescription>
                  Automated recommendations from your spending patterns (not applied automatically)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {budgetSuggestions.map((s) => (
                    <li key={s.id} className="flex gap-2 items-start">
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {s.priority}
                      </Badge>
                      <span>{s.recommendation}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Add budget</CardTitle>
              <CardDescription>Monthly limit per category</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleCreate}
                className="flex flex-wrap gap-4 items-end"
              >
                <div className="space-y-2 min-w-[160px]">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Transport"
                    required
                  />
                </div>
                <div className="space-y-2 min-w-[120px]">
                  <Label htmlFor="limit">Limit (GHS)</Label>
                  <Input
                    id="limit"
                    type="number"
                    min="0"
                    step="0.01"
                    value={limitAmount}
                    onChange={(e) => setLimitAmount(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={saving}>
                  <Plus className="w-4 h-4 mr-2" />
                  {saving ? "Saving…" : "Add"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {loading ? (
            <p className="text-muted-foreground">Loading budgets…</p>
          ) : budgets.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No budgets yet. Add one above or create via automation rules.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {budgets.map((b) => (
                <Card key={b.id}>
                  <CardHeader className="flex flex-row items-start justify-between pb-2">
                    <div>
                      <CardTitle className="text-lg">{b.category}</CardTitle>
                      <CardDescription>
                        GHS {b.spent.toFixed(0)} / {Number(b.limit_amount).toFixed(0)}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(b.id)}
                      aria-label="Delete budget"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Progress
                      value={Math.min(100, b.percentUsed)}
                      indicatorClassName={
                        b.overBudget
                          ? "bg-destructive"
                          : "bg-blue-500 dark:bg-blue-400"
                      }
                    />
                    <div className="flex justify-between text-sm">
                      <span>{b.percentUsed}% used</span>
                      {b.overBudget ? (
                        <Badge variant="destructive">Over budget</Badge>
                      ) : (
                        <span className="text-muted-foreground">
                          GHS {b.remaining.toFixed(0)} left
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
