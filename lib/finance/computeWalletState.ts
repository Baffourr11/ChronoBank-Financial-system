export type RiskLevel = "low" | "medium" | "high" | "unknown";

export interface WalletProjection {
  days7: number | null;
  days30: number | null;
  days90: number | null;
}

export interface BudgetAllocation {
  category: string;
  remaining: number;
  percentUsed: number;
}

import type { WalletBalanceContext } from "@/lib/finance/balanceContext";

export interface WalletState {
  /** Sum of account balances (transaction-derived, all imported history). */
  currentBalance: number;
  /** Current minus earmarked budget headroom. */
  availableBalance: number;
  /** Sum of unspent budget limits (planned allocations). */
  reservedFunds: number;
  projections: WalletProjection;
  riskLevel: RiskLevel;
  lowestProjected30d: number | null;
  automation: {
    activeRules: number;
    unreadAlerts: number;
    recentExecutions: number;
  };
  budgetAllocations: BudgetAllocation[];
  hasForecast: boolean;
  balanceContext: WalletBalanceContext;
}

interface PredictionRow {
  prediction_type: string;
  predicted_value: number | string;
  metadata?: Record<string, unknown> | null;
}

interface BudgetRow {
  category: string;
  limit_amount: number | string;
  spent?: number;
  remaining?: number;
}

export function computeReservedFromBudgets(
  budgets: BudgetRow[],
): { reserved: number; allocations: BudgetAllocation[] } {
  const allocations: BudgetAllocation[] = [];
  let reserved = 0;

  for (const b of budgets) {
    const limit = Number(b.limit_amount) || 0;
    const spent = Number(b.spent ?? 0);
    const remaining =
      b.remaining != null
        ? Number(b.remaining)
        : Math.max(0, limit - spent);
    if (remaining > 0) {
      reserved += remaining;
      allocations.push({
        category: b.category,
        remaining,
        percentUsed: limit > 0 ? Math.round((spent / limit) * 100) : 0,
      });
    }
  }

  allocations.sort((a, b) => b.remaining - a.remaining);
  return { reserved, allocations };
}

export function projectionsFromPredictions(
  predictions: PredictionRow[],
): WalletProjection {
  const pick = (type: string) => {
    const row = predictions.find((p) => p.prediction_type === type);
    if (!row) return null;
    const meta = row.metadata as { endBalance?: number } | null | undefined;
    if (meta?.endBalance != null) return Number(meta.endBalance);
    return Number(row.predicted_value);
  };

  return {
    days7: pick("cash_flow_7d"),
    days30: pick("cash_flow_30d"),
    days90: pick("cash_flow_90d"),
  };
}

export function deriveRiskLevel(
  projections: WalletProjection,
  availableBalance: number,
  predictions: PredictionRow[],
): RiskLevel {
  const riskPred = predictions.find(
    (p) => p.prediction_type === "low_balance_risk",
  );
  const meta = riskPred?.metadata as
    | { issue?: { severity?: string } }
    | null
    | undefined;
  if (meta?.issue?.severity === "high") return "high";
  if (meta?.issue?.severity === "medium") return "medium";
  if (meta?.issue?.severity === "low") return "low";

  const p30 = projections.days30;
  if (p30 == null) return "unknown";
  if (p30 < 0 || availableBalance <= 0) return "high";
  if (p30 < availableBalance * 0.3) return "medium";
  return "low";
}

const emptyBalanceContext: WalletBalanceContext = {
  balanceAsOf: null,
  datasetRangeStart: null,
  datasetRangeEnd: null,
  yearToDateIncome: 0,
  yearToDateExpenses: 0,
  yearToDateNet: 0,
  isDataStale: false,
  daysSinceLastTransaction: null,
};

export function buildWalletState(input: {
  currentBalance: number;
  budgets: BudgetRow[];
  predictions: PredictionRow[];
  automation: {
    activeRules: number;
    unreadAlerts: number;
    recentExecutions: number;
  };
  balanceContext?: WalletBalanceContext;
}): WalletState {
  const { reserved, allocations } = computeReservedFromBudgets(input.budgets);
  const availableBalance = Math.max(0, input.currentBalance - reserved);
  const projections = projectionsFromPredictions(input.predictions);
  const riskLevel = deriveRiskLevel(
    projections,
    availableBalance,
    input.predictions,
  );

  const forecast30 = input.predictions.find(
    (p) => p.prediction_type === "cash_flow_30d",
  );
  const meta30 = forecast30?.metadata as { lowestBalance?: number } | null;

  return {
    currentBalance: input.currentBalance,
    availableBalance,
    reservedFunds: reserved,
    projections,
    riskLevel,
    lowestProjected30d:
      meta30?.lowestBalance != null
        ? Number(meta30.lowestBalance)
        : projections.days30,
    automation: input.automation,
    budgetAllocations: allocations.slice(0, 5),
    hasForecast:
      projections.days7 != null ||
      projections.days30 != null ||
      projections.days90 != null,
    balanceContext: input.balanceContext ?? emptyBalanceContext,
  };
}
