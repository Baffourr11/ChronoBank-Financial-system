import type { CashFlowForecast } from "@/lib/analytics/Forecaster";
import type { SpendingPattern } from "@/lib/analytics/PatternDetector";
import type { ITransaction } from "@/lib/models/Transaction";
import type { IAccount } from "@/lib/models/Account";

/** Predictive early-warning escalation tiers */
export type WarningLevel = 1 | 2 | 3;

export interface CashFlowIssue {
  date: string;
  type: "negative_balance" | "low_balance" | "cash_flow_gap";
  severity: "low" | "medium" | "high";
  description: string;
  projectedBalance: number;
}

export interface BudgetRow {
  id: string;
  category: string;
  limit_amount: number;
  period: string;
  alert_threshold: number;
}

export interface IntelligenceSnapshot {
  transactions: ITransaction[];
  accounts: IAccount[];
  totalBalance: number;
  patterns: SpendingPattern[];
  cashFlowForecast: CashFlowForecast[];
  cashFlowIssues: {
    hasIssues: boolean;
    issues: CashFlowIssue[];
  };
}

export interface IncomeTimingProfile {
  peakDaysOfWeek: { day: number; label: string; avgAmount: number }[];
  isIrregular: boolean;
  nextExpectedInflowDays: number | null;
  note: string;
}

export interface AutomationLayerResult {
  warningLevel: WarningLevel | null;
  virtualReserve: number;
  incomeProfile: IncomeTimingProfile | null;
  budgetRecommendations: number;
  insightsGenerated: number;
  alertsCreated: number;
}

export const AUTOMATION_SOURCES = [
  "automation",
  "budget_automation",
  "insight_automation",
  "early_warning",
] as const;
