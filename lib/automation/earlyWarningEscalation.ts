import type { SupabaseClient } from "@supabase/supabase-js";
import type { IntelligenceSnapshot, WarningLevel } from "@/lib/automation/types";
import { formatGhs } from "@/lib/automation/format";

const LOW_BALANCE_FLOOR = 500;

export interface EscalationResult {
  level: WarningLevel | null;
  title: string;
  message: string;
  alertSeverity: "low" | "medium" | "high";
}

export function evaluateWarningLevel(
  snapshot: IntelligenceSnapshot,
): EscalationResult | null {
  const { cashFlowForecast, cashFlowIssues, totalBalance } = snapshot;
  if (cashFlowForecast.length < 7) return null;

  const now = new Date();
  const horizon7 = cashFlowForecast.slice(0, 7);
  const horizon14 = cashFlowForecast.slice(0, 14);

  const lowest7 = horizon7.reduce((min, f) =>
    f.balance < min.balance ? f : min,
  );
  const lowest14 = horizon14.reduce((min, f) =>
    f.balance < min.balance ? f : min,
  );

  const daysUntilLow7 = Math.max(
    1,
    Math.ceil(
      (new Date(lowest7.date).getTime() - now.getTime()) / 86400000,
    ),
  );
  const daysUntilLow14 = Math.max(
    1,
    Math.ceil(
      (new Date(lowest14.date).getTime() - now.getTime()) / 86400000,
    ),
  );

  const criticalIssue = cashFlowIssues.issues.find(
    (i) =>
      i.type === "negative_balance" ||
      (i.severity === "high" && i.type === "low_balance"),
  );
  const warningIssue = cashFlowIssues.issues.find(
    (i) => i.type === "low_balance" || i.type === "cash_flow_gap",
  );

  // Level 3 — critical liquidity shortfall
  if (
    lowest7.balance < 0 ||
    criticalIssue ||
    (lowest7.balance < LOW_BALANCE_FLOOR && daysUntilLow7 <= 7)
  ) {
    const target = criticalIssue?.projectedBalance ?? lowest7.balance;
    return {
      level: 3,
      title: "Critical: Liquidity shortfall risk",
      message: `Critical: High probability of liquidity shortfall within ${daysUntilLow7} day${daysUntilLow7 === 1 ? "" : "s"}. Projected balance may reach ${formatGhs(Math.max(0, target))}. Review expenses and incoming payments immediately.`,
      alertSeverity: "high",
    };
  }

  // Level 2 — warning
  if (
    warningIssue ||
    (lowest14.balance < totalBalance * 0.25 && lowest14.balance > 0) ||
    (lowest7.balance < LOW_BALANCE_FLOOR && daysUntilLow7 <= 14)
  ) {
    const bal = warningIssue?.projectedBalance ?? lowest14.balance;
    return {
      level: 2,
      title: "Warning: Cash-flow pressure ahead",
      message: `Warning: Based on recent patterns, your balance may fall below ${formatGhs(LOW_BALANCE_FLOOR)} within ${Math.min(daysUntilLow7, daysUntilLow14)} days (projected ${formatGhs(bal)}).`,
      alertSeverity: "medium",
    };
  }

  // Level 1 — informational downward trend
  const recentNet = horizon7.reduce((s, f) => s + f.netCashFlow, 0);
  const startBal = cashFlowForecast[0]?.balance ?? totalBalance;
  const endBal7 = horizon7[horizon7.length - 1]?.balance ?? startBal;
  const downwardTrend = endBal7 < startBal * 0.95 && recentNet < 0;

  if (downwardTrend || cashFlowIssues.issues.some((i) => i.severity === "low")) {
    return {
      level: 1,
      title: "Notice: Minor cash-flow trend",
      message:
        "Informational: Minor downward cash-flow trends detected in the next week. Monitor spending and upcoming inflows.",
      alertSeverity: "low",
    };
  }

  return null;
}

export async function persistEarlyWarningAlert(
  supabase: SupabaseClient,
  userId: string,
  datasetId: string,
  escalation: EscalationResult,
): Promise<boolean> {
  const type = `early_warning_l${escalation.level}`;

  await supabase
    .from("alerts")
    .delete()
    .eq("user_id", userId)
    .eq("dataset_id", datasetId)
    .eq("is_read", false)
    .like("type", "early_warning_%");

  const { error } = await supabase.from("alerts").insert({
    user_id: userId,
    dataset_id: datasetId,
    rule_id: null,
    type,
    title: escalation.title,
    message: escalation.message,
    severity: escalation.alertSeverity,
    is_read: false,
    data: {
      warningLevel: escalation.level,
      source: "early_warning",
    },
  });

  return !error;
}
