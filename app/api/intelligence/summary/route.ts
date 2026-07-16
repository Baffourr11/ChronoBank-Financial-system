import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/api/helpers";
import { apiSuccess, apiError } from "@/lib/api";
import {
  getDatasetIdFromRequest,
  resolveDatasetId,
} from "@/lib/dataset/resolveDataset";
import { computeHealthScore } from "@/lib/intelligence/healthScore";

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedContext();
    if (!user) return apiError("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const datasetId = await resolveDatasetId(
      supabase,
      user.userId,
      getDatasetIdFromRequest(searchParams),
    );

    if (!datasetId) {
      return apiSuccess({
        datasetId: null,
        healthScore: computeHealthScore({
          totalBalance: 0,
          monthlyIncome: 0,
          monthlyExpenses: 0,
          transactionCount: 0,
          hasEnoughData: false,
          historyDays: 0,
          unreadAlerts: 0,
        }),
        predictions: [],
        recommendations: [],
        automation: { activeRules: 0, unreadAlerts: 0, recentExecutions: 0 },
        forecast30d: null,
      });
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [
      { data: accounts },
      { data: monthTx },
      { count: txCount },
      { data: predictions },
      { data: recommendations },
      { count: unreadAlerts },
      { count: activeRules },
      { count: recentExecutions },
      { data: dataset },
    ] = await Promise.all([
      supabase
        .from("accounts")
        .select("balance")
        .eq("user_id", user.userId)
        .eq("dataset_id", datasetId),
      supabase
        .from("transactions")
        .select("type, amount, date")
        .eq("user_id", user.userId)
        .eq("dataset_id", datasetId)
        .gte("date", monthStart),
      supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.userId)
        .eq("dataset_id", datasetId),
      supabase
        .from("predictions")
        .select("*")
        .eq("user_id", user.userId)
        .eq("dataset_id", datasetId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("recommendations")
        .select("*")
        .eq("user_id", user.userId)
        .eq("dataset_id", datasetId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("alerts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.userId)
        .eq("dataset_id", datasetId)
        .eq("is_read", false),
      supabase
        .from("rules")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.userId)
        .eq("dataset_id", datasetId)
        .eq("is_active", true),
      supabase
        .from("rule_executions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.userId)
        .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
      supabase
        .from("datasets")
        .select("date_range_start, date_range_end, transaction_count")
        .eq("id", datasetId)
        .maybeSingle(),
    ]);

    const totalBalance = (accounts ?? []).reduce(
      (sum, a) => sum + Number(a.balance),
      0,
    );

    let monthlyIncome = 0;
    let monthlyExpenses = 0;
    for (const tx of monthTx ?? []) {
      const amt = Number(tx.amount);
      if (tx.type === "income") monthlyIncome += amt;
      else if (tx.type === "expense") monthlyExpenses += amt;
    }

    let historyDays = 0;
    if (dataset?.date_range_start && dataset?.date_range_end) {
      historyDays = Math.ceil(
        (new Date(dataset.date_range_end).getTime() -
          new Date(dataset.date_range_start).getTime()) /
          86400000,
      );
    }

    const forecast30 = (predictions ?? []).find(
      (p) => p.prediction_type === "cash_flow_30d",
    );
    const riskPred = (predictions ?? []).find(
      (p) => p.prediction_type === "low_balance_risk",
    );
    const riskMeta = riskPred?.metadata as { issue?: { severity?: string } } | null;
    const warningPred = (predictions ?? []).find(
      (p) => p.prediction_type === "warning_escalation",
    );
    const reservePred = (predictions ?? []).find(
      (p) => p.prediction_type === "virtual_reserve",
    );
    const warningMeta = warningPred?.metadata as {
      title?: string;
      message?: string;
    } | null;
    const reserveMeta = reservePred?.metadata as { rationale?: string } | null;

    const { data: incomePattern } = await supabase
      .from("behavior_patterns")
      .select("description, metadata")
      .eq("user_id", user.userId)
      .eq("dataset_id", datasetId)
      .eq("pattern_type", "income_timing")
      .maybeSingle();

    const budgetSuggestions = (recommendations ?? []).filter(
      (r) => r.source === "budget_automation",
    );
    const insightItems = (recommendations ?? []).filter(
      (r) => r.source === "insight_automation",
    );

    const warningLevel = warningPred
      ? (Number(warningPred.predicted_value) as 1 | 2 | 3)
      : null;

    const healthScore = computeHealthScore({
      totalBalance,
      monthlyIncome,
      monthlyExpenses,
      transactionCount: txCount ?? 0,
      hasEnoughData: (txCount ?? 0) >= 20,
      historyDays,
      unreadAlerts: unreadAlerts ?? 0,
      cashFlowRiskSeverity: (riskMeta?.issue?.severity as "low" | "medium" | "high") ?? null,
      activeRecommendationsHigh: (recommendations ?? []).filter(
        (r) => r.priority === "high",
      ).length,
      warningLevel,
    });

    return apiSuccess({
      datasetId,
      healthScore,
      predictions: predictions ?? [],
      recommendations: recommendations ?? [],
      automation: {
        activeRules: activeRules ?? 0,
        unreadAlerts: unreadAlerts ?? 0,
        recentExecutions: recentExecutions ?? 0,
      },
      forecast30d: forecast30
        ? {
            lowestBalance: Number(forecast30.predicted_value),
            metadata: forecast30.metadata,
            confidence: forecast30.confidence,
          }
        : null,
      automationEnhancements: {
        warningLevel,
        warningTitle: warningMeta?.title ?? null,
        warningMessage: warningMeta?.message ?? null,
        virtualReserve: reservePred ? Number(reservePred.predicted_value) : null,
        virtualReserveNote: reserveMeta?.rationale ?? null,
        incomeTimingNote: incomePattern?.description ?? null,
        budgetSuggestionCount: budgetSuggestions.length,
        insightCount: insightItems.length,
      },
    });
  } catch (error) {
    console.error("Intelligence summary error:", error);
    return apiError("Failed to fetch intelligence summary", 500);
  }
}
