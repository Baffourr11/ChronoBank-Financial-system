import type { SupabaseClient } from "@supabase/supabase-js";
import type { IntelligenceSnapshot } from "@/lib/automation/types";
import type { IncomeTimingProfile } from "@/lib/automation/types";
import { formatGhs } from "@/lib/automation/format";

/**
 * Virtual precautionary reserve (no money locked — recommendation only).
 */
export function calculateVirtualReserve(
  snapshot: IntelligenceSnapshot,
  incomeProfile: IncomeTimingProfile | null,
): { amount: number; rationale: string } {
  const { transactions, totalBalance, cashFlowForecast, cashFlowIssues } =
    snapshot;

  const expenses = transactions.filter((t) => t.type === "expense");
  const last30 = expenses.filter((t) => {
    const d = new Date(t.date);
    return Date.now() - d.getTime() <= 30 * 86400000;
  });
  const avgDailyOut =
    last30.length > 0
      ? last30.reduce((s, t) => s + t.amount, 0) / 30
      : 0;

  const recurringMonthly = expenses
    .filter((t) => t.isRecurring)
    .reduce((s, t) => s + t.amount, 0);
  const recurringComponent = recurringMonthly > 0 ? recurringMonthly / 30 : 0;

  const volatility =
    last30.length > 1
      ? (() => {
          const amounts = last30.map((t) => t.amount);
          const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
          const v =
            amounts.reduce((s, a) => s + (a - mean) ** 2, 0) / amounts.length;
          return mean > 0 ? Math.sqrt(v) / mean : 0.15;
        })()
      : 0.15;

  const horizon14 = cashFlowForecast.slice(0, 14);
  const minBal14 =
    horizon14.length > 0
      ? Math.min(...horizon14.map((f) => f.balance))
      : totalBalance;

  const riskBuffer =
    cashFlowIssues.hasIssues && cashFlowIssues.issues.some((i) => i.severity === "high")
      ? avgDailyOut * 14
      : avgDailyOut * 7;

  let reserve =
    riskBuffer +
    recurringComponent * 7 +
    Math.max(0, totalBalance - minBal14) * 0.1 +
    avgDailyOut * volatility * 5;

  if (incomeProfile?.isIrregular) {
    reserve *= 1.15;
  }

  reserve = Math.max(0, Math.min(reserve, totalBalance * 0.5));
  reserve = Math.round(reserve);

  const rationale = `Recommended precautionary reserve: ${formatGhs(reserve)} to reduce short-term liquidity risk (covers ~${Math.ceil(riskBuffer / Math.max(avgDailyOut, 1))} days of typical outflows plus volatility buffer).`;

  return { amount: reserve, rationale };
}

export async function persistVirtualReserve(
  supabase: SupabaseClient,
  userId: string,
  datasetId: string,
  amount: number,
  rationale: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 1);

  await supabase
    .from("predictions")
    .delete()
    .eq("user_id", userId)
    .eq("dataset_id", datasetId)
    .eq("prediction_type", "virtual_reserve");

  await supabase.from("predictions").insert({
    user_id: userId,
    dataset_id: datasetId,
    prediction_type: "virtual_reserve",
    predicted_value: amount,
    confidence: 0.75,
    metadata: { rationale, ...metadata },
    valid_until: validUntil.toISOString(),
  });
}
