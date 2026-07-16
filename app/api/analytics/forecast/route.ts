import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/api/helpers";
import { apiSuccess, apiError } from "@/lib/api";
import { toITransaction, toIAccount } from "@/lib/mappers";
import type { AccountRow, TransactionRow } from "@/lib/supabase/types";
import { PatternDetector } from "@/lib/analytics/PatternDetector";
import { Forecaster } from "@/lib/analytics/Forecaster";
import {
  getDatasetIdFromRequest,
  resolveDatasetId,
} from "@/lib/dataset/resolveDataset";
import { persistForecastInsights } from "@/lib/intelligence/persistInsights";
import { RuleEngine } from "@/lib/rules/RuleEngine";

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedContext();
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const forecastDays = parseInt(searchParams.get("days") || "90");
    const currentBalance = parseFloat(searchParams.get("balance") || "0");

    const datasetId = await resolveDatasetId(
      supabase,
      user.userId,
      getDatasetIdFromRequest(searchParams),
    );

    if (!datasetId) {
      return apiError("No dataset selected", 400);
    }

    const [{ data: txRows }, { data: accRows }] = await Promise.all([
      supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.userId)
        .eq("dataset_id", datasetId)
        .order("date", { ascending: false })
        .limit(2000),
      supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.userId)
        .eq("dataset_id", datasetId),
    ]);

    const transactions = ((txRows ?? []) as TransactionRow[]).map(toITransaction);
    const accounts = ((accRows ?? []) as AccountRow[]).map(toIAccount);

    const patterns = PatternDetector.detectSpendingPatterns(transactions);
    const spendingForecasts = Forecaster.generateDailySpendingForecast(
      transactions,
      patterns,
      forecastDays,
    );
    const spendingPeriodSummaries = Forecaster.generateSpendingForecast(
      transactions,
      patterns,
      forecastDays,
    );

    const totalBalance =
      currentBalance > 0
        ? currentBalance
        : accounts.reduce((sum, acc) => sum + acc.balance, 0);

    const cashFlowForecast = Forecaster.generateCashFlowForecast(
      transactions,
      totalBalance,
      forecastDays,
    );
    const seasonalForecast = Forecaster.generateSeasonalForecast(
      transactions,
      patterns,
    );
    const cashFlowIssues = Forecaster.detectCashFlowIssues(cashFlowForecast);

    await persistForecastInsights(supabase, user.userId, datasetId, {
      cashFlowForecast,
      cashFlowIssues,
      seasonalForecast,
      currentBalance: totalBalance,
    });

    await RuleEngine.processRules(
      supabase,
      user.userId,
      { type: "forecast" },
      datasetId,
    );

    return apiSuccess({
      spendingForecasts,
      spendingPeriodSummaries,
      cashFlowForecast,
      seasonalForecast,
      cashFlowIssues,
      saved: true,
      metadata: {
        forecastDays,
        currentBalance: totalBalance,
        datasetId,
        patternsCount: patterns.length,
        dataPoints: transactions.length,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Forecast error:", error);
    return apiError("Failed to generate forecast", 500);
  }
}
