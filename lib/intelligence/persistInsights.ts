import type { SupabaseClient } from "@supabase/supabase-js";
import type { CashFlowForecast } from "@/lib/analytics/Forecaster";
import type { ITransaction } from "@/lib/models/Transaction";
import { PatternDetector } from "@/lib/analytics/PatternDetector";
import { Forecaster } from "@/lib/analytics/Forecaster";
import { toITransaction, toIAccount } from "@/lib/mappers";
import type { AccountRow, TransactionRow } from "@/lib/supabase/types";
import type { IntelligenceSnapshot } from "@/lib/automation/types";

const FORECAST_HORIZONS = [
  { type: "cash_flow_7d", days: 7 },
  { type: "cash_flow_30d", days: 30 },
  { type: "cash_flow_90d", days: 90 },
] as const;

export async function persistForecastInsights(
  supabase: SupabaseClient,
  userId: string,
  datasetId: string,
  payload: {
    cashFlowForecast: CashFlowForecast[];
    cashFlowIssues: ReturnType<typeof Forecaster.detectCashFlowIssues>;
    seasonalForecast: ReturnType<typeof Forecaster.generateSeasonalForecast>;
    currentBalance: number;
  },
): Promise<void> {
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 1);

  await supabase
    .from("predictions")
    .delete()
    .eq("user_id", userId)
    .eq("dataset_id", datasetId)
    .in(
      "prediction_type",
      FORECAST_HORIZONS.map((h) => h.type).concat([
        "low_balance_risk",
        "seasonal_spending",
      ]),
    );

  const inserts: Record<string, unknown>[] = [];

  for (const { type, days } of FORECAST_HORIZONS) {
    const slice = payload.cashFlowForecast.slice(0, days);
    if (slice.length === 0) continue;
    const lowest = slice.reduce((min, f) =>
      f.balance < min.balance ? f : min,
    );
    inserts.push({
      user_id: userId,
      dataset_id: datasetId,
      prediction_type: type,
      predicted_value: lowest.balance,
      confidence: lowest.confidence,
      metadata: {
        lowestBalance: lowest.balance,
        lowestDate: lowest.date,
        endBalance: slice[slice.length - 1]?.balance,
        horizonDays: days,
      },
      valid_until: validUntil.toISOString(),
    });
  }

  const firstIssue = payload.cashFlowIssues.issues[0];
  if (firstIssue) {
    inserts.push({
      user_id: userId,
      dataset_id: datasetId,
      prediction_type: "low_balance_risk",
      predicted_value: firstIssue.projectedBalance,
      confidence: firstIssue.severity === "high" ? 0.9 : 0.7,
      metadata: {
        issue: firstIssue,
        issueCount: payload.cashFlowIssues.issues.length,
      },
      valid_until: validUntil.toISOString(),
    });
  }

  const peakSeason = [...payload.seasonalForecast].sort(
    (a, b) => b.predictedSpending - a.predictedSpending,
  )[0];
  if (peakSeason) {
    inserts.push({
      user_id: userId,
      dataset_id: datasetId,
      prediction_type: "seasonal_spending",
      predicted_value: peakSeason.predictedSpending,
      confidence: peakSeason.confidence,
      metadata: { peakMonth: peakSeason.month, seasonalForecast: payload.seasonalForecast },
      valid_until: validUntil.toISOString(),
    });
  }

  if (inserts.length > 0) {
    await supabase.from("predictions").insert(inserts);
  }

  const recs: { recommendation: string; priority: string; metadata: Record<string, unknown> }[] =
    [];

  for (const issue of payload.cashFlowIssues.issues.slice(0, 5)) {
    recs.push({
      recommendation: issue.description,
      priority: issue.severity === "high" ? "high" : "medium",
      metadata: { source: "cash_flow", issue },
    });
  }

  if (payload.currentBalance > 0 && firstIssue) {
    const daysUntil = Math.max(
      1,
      Math.ceil(
        (new Date(firstIssue.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      ),
    );
    recs.push({
      recommendation: `Projected balance may drop to ${firstIssue.projectedBalance.toFixed(2)} in about ${daysUntil} days. Review upcoming expenses.`,
      priority: "high",
      metadata: { source: "forecast", daysUntil, balance: firstIssue.projectedBalance },
    });
  }

  if (recs.length > 0) {
    await supabase.from("recommendations").insert(
      recs.map((r) => ({
        user_id: userId,
        dataset_id: datasetId,
        recommendation: r.recommendation,
        priority: r.priority,
        status: "active",
        source: "forecast",
        metadata: r.metadata,
      })),
    );
  }
}

export async function persistPatternInsights(
  supabase: SupabaseClient,
  userId: string,
  datasetId: string,
  transactions: ITransaction[],
): Promise<void> {
  const patterns = PatternDetector.detectSpendingPatterns(transactions);
  const ghanaian = PatternDetector.detectGhanaianPatterns(transactions);
  const anomalies = PatternDetector.detectAnomalies(transactions, patterns);

  await supabase
    .from("behavior_patterns")
    .delete()
    .eq("user_id", userId)
    .eq("dataset_id", datasetId);

  const rows: Record<string, unknown>[] = [];

  for (const p of patterns.slice(0, 20)) {
    rows.push({
      user_id: userId,
      dataset_id: datasetId,
      pattern_type: "spending",
      label: p.category,
      description: `Average ${p.category} spend with ${(p.confidence * 100).toFixed(0)}% confidence`,
      confidence: p.confidence,
      metadata: p,
    });
  }

  if (ghanaian.paydaySpending) {
    rows.push({
      user_id: userId,
      dataset_id: datasetId,
      pattern_type: "cultural",
      label: "payday_spending",
      description: "Higher spending around month-end pay cycles",
      confidence: 0.8,
      metadata: ghanaian,
    });
  }
  for (const festival of ghanaian.seasonalFestivals) {
    rows.push({
      user_id: userId,
      dataset_id: datasetId,
      pattern_type: "cultural",
      label: "seasonal_festival",
      description: `Seasonal festival spending: ${festival}`,
      confidence: 0.75,
      metadata: { festival, ghanaian },
    });
  }

  for (const a of anomalies.slice(0, 10)) {
    rows.push({
      user_id: userId,
      dataset_id: datasetId,
      pattern_type: "anomaly",
      label: a.type,
      description: a.description,
      confidence: a.severity === "high" ? 0.9 : 0.7,
      metadata: a,
    });
  }

  if (rows.length > 0) {
    await supabase.from("behavior_patterns").insert(rows);
  }

  const recs = anomalies.slice(0, 5).map((a) => ({
    user_id: userId,
    dataset_id: datasetId,
    recommendation: `Review unusual activity: ${a.description}.`,
    priority: "medium",
    status: "active",
    source: "patterns",
    metadata: { anomaly: a },
  }));

  const topSpend = [...patterns].sort((a, b) => b.averageAmount - a.averageAmount)[0];
  if (topSpend) {
    recs.push({
      user_id: userId,
      dataset_id: datasetId,
      recommendation: `Your largest recurring category is ${topSpend.category}. Consider setting a budget to control growth.`,
      priority: "low",
      status: "active",
      source: "patterns",
      metadata: { pattern: topSpend },
    });
  }

  if (recs.length > 0) {
    await supabase.from("recommendations").insert(recs);
  }
}

export async function refreshDatasetIntelligence(
  supabase: SupabaseClient,
  userId: string,
  datasetId: string,
): Promise<IntelligenceSnapshot | null> {
  const [{ data: txRows }, { data: accRows }] = await Promise.all([
    supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .eq("dataset_id", datasetId)
      .order("date", { ascending: false })
      .limit(2000),
    supabase
      .from("accounts")
      .select("*")
      .eq("user_id", userId)
      .eq("dataset_id", datasetId),
  ]);

  const transactions = ((txRows ?? []) as TransactionRow[]).map(toITransaction);
  const accounts = ((accRows ?? []) as AccountRow[]).map(toIAccount);
  if (transactions.length < 3) return null;

  const patterns = PatternDetector.detectSpendingPatterns(transactions);
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const cashFlowForecast = Forecaster.generateCashFlowForecast(
    transactions,
    totalBalance,
    90,
  );
  const seasonalForecast = Forecaster.generateSeasonalForecast(transactions, patterns);
  const cashFlowIssues = Forecaster.detectCashFlowIssues(cashFlowForecast);

  await persistForecastInsights(supabase, userId, datasetId, {
    cashFlowForecast,
    cashFlowIssues,
    seasonalForecast,
    currentBalance: totalBalance,
  });

  await persistPatternInsights(supabase, userId, datasetId, transactions);

  return {
    transactions,
    accounts,
    totalBalance,
    patterns,
    cashFlowForecast,
    cashFlowIssues,
  };
}
