import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AutomationLayerResult,
  IntelligenceSnapshot,
} from "@/lib/automation/types";
import { AUTOMATION_SOURCES } from "@/lib/automation/types";
import {
  evaluateWarningLevel,
  persistEarlyWarningAlert,
} from "@/lib/automation/earlyWarningEscalation";
import {
  analyzeIncomeTiming,
  incomeAlertDelayDays,
} from "@/lib/automation/incomePatternTriggers";
import { generateBudgetRecommendations } from "@/lib/automation/budgetAutoAdjustment";
import {
  calculateVirtualReserve,
  persistVirtualReserve,
} from "@/lib/automation/virtualReserve";
import { generateBusinessInsights } from "@/lib/automation/insightGeneration";

async function clearAutomationRecommendations(
  supabase: SupabaseClient,
  userId: string,
  datasetId: string,
): Promise<void> {
  await supabase
    .from("recommendations")
    .delete()
    .eq("user_id", userId)
    .eq("dataset_id", datasetId)
    .eq("status", "active")
    .in("source", [...AUTOMATION_SOURCES]);
}

async function insertRecommendations(
  supabase: SupabaseClient,
  userId: string,
  datasetId: string,
  items: {
    recommendation: string;
    priority: string;
    source: string;
    metadata?: Record<string, unknown>;
  }[],
): Promise<void> {
  if (items.length === 0) return;
  await supabase.from("recommendations").insert(
    items.map((r) => ({
      user_id: userId,
      dataset_id: datasetId,
      recommendation: r.recommendation,
      priority: r.priority,
      status: "active",
      source: r.source,
      metadata: r.metadata ?? {},
    })),
  );
}

/**
 * Runs predictive + behaviour + insight automation after intelligence refresh.
 */
export async function runAutomationLayer(
  supabase: SupabaseClient,
  userId: string,
  datasetId: string,
  snapshot: IntelligenceSnapshot,
  budgets: { id: string; category: string; limit_amount: number; period: string; alert_threshold: number }[],
): Promise<AutomationLayerResult> {
  const incomeProfile = analyzeIncomeTiming(snapshot.transactions);
  const alertDelay = incomeAlertDelayDays(incomeProfile);

  let escalation = evaluateWarningLevel(snapshot);
  if (
    escalation &&
    alertDelay > 0 &&
    (escalation.level === 1 || escalation.level === 2)
  ) {
    escalation = {
      ...escalation,
      message: `${escalation.message} ${incomeProfile?.note ?? ""}`.trim(),
    };
  }

  let alertsCreated = 0;
  if (escalation) {
    const ok = await persistEarlyWarningAlert(
      supabase,
      userId,
      datasetId,
      escalation,
    );
    if (ok) alertsCreated = 1;
  }

  const { amount: virtualReserve, rationale } = calculateVirtualReserve(
    snapshot,
    incomeProfile,
  );
  await persistVirtualReserve(supabase, userId, datasetId, virtualReserve, rationale, {
    incomeIrregular: incomeProfile?.isIrregular ?? false,
    alertDelayDays: alertDelay,
    warningLevel: escalation?.level ?? null,
  });

  if (incomeProfile) {
    await supabase
      .from("behavior_patterns")
      .delete()
      .eq("user_id", userId)
      .eq("dataset_id", datasetId)
      .eq("pattern_type", "income_timing");

    await supabase.from("behavior_patterns").insert({
      user_id: userId,
      dataset_id: datasetId,
      pattern_type: "income_timing",
      label: "income_cycle",
      description: incomeProfile.note,
      confidence: incomeProfile.isIrregular ? 0.65 : 0.85,
      metadata: incomeProfile,
    });
  }

  const budgetRecs = generateBudgetRecommendations(
    snapshot.transactions,
    budgets,
    snapshot.patterns,
  );
  const insights = generateBusinessInsights(
    snapshot,
    incomeProfile,
    virtualReserve,
  );

  await clearAutomationRecommendations(supabase, userId, datasetId);

  const reserveRec = {
    recommendation: rationale,
    priority: virtualReserve > snapshot.totalBalance * 0.3 ? "high" : "medium",
    source: "automation",
    metadata: {
      source: "automation",
      type: "virtual_reserve",
      amount: virtualReserve,
    },
  };

  await insertRecommendations(supabase, userId, datasetId, [
  reserveRec,
  ...budgetRecs.map((r) => ({
    recommendation: r.recommendation,
    priority: r.priority,
    source: "budget_automation",
    metadata: r.metadata,
  })),
  ...insights.map((r) => ({
    recommendation: r.recommendation,
    priority: r.priority,
    source: "insight_automation",
    metadata: r.metadata,
  })),
  ]);

  await supabase
    .from("predictions")
    .delete()
    .eq("user_id", userId)
    .eq("dataset_id", datasetId)
    .eq("prediction_type", "warning_escalation");

  if (escalation) {
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 1);
    await supabase.from("predictions").insert({
      user_id: userId,
      dataset_id: datasetId,
      prediction_type: "warning_escalation",
      predicted_value: escalation.level,
      confidence: escalation.level === 3 ? 0.9 : escalation.level === 2 ? 0.75 : 0.6,
      metadata: {
        title: escalation.title,
        message: escalation.message,
        alertDelayDays: alertDelay,
      },
      valid_until: validUntil.toISOString(),
    });
  }

  return {
    warningLevel: escalation?.level ?? null,
    virtualReserve,
    incomeProfile,
    budgetRecommendations: budgetRecs.length,
    insightsGenerated: insights.length,
    alertsCreated,
  };
}
