import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/api/helpers";
import { apiSuccess, apiError } from "@/lib/api";
import { toITransaction } from "@/lib/mappers";
import type { TransactionRow } from "@/lib/supabase/types";
import { PatternDetector } from "@/lib/analytics/PatternDetector";
import {
  getDatasetIdFromRequest,
  resolveDatasetId,
} from "@/lib/dataset/resolveDataset";
import { runIntelligencePipeline } from "@/lib/intelligence/pipeline";

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedContext();
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const lookbackDays = parseInt(searchParams.get("lookbackDays") || "365");

    const datasetId = await resolveDatasetId(
      supabase,
      user.userId,
      getDatasetIdFromRequest(searchParams),
    );

    if (!datasetId) {
      return apiError("No dataset selected", 400);
    }

    const { data: rows, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.userId)
      .eq("dataset_id", datasetId)
      .order("date", { ascending: false })
      .limit(2000);

    if (error) throw error;

    const transactions = ((rows ?? []) as TransactionRow[]).map(toITransaction);
    const patterns = PatternDetector.detectSpendingPatterns(
      transactions,
      lookbackDays,
    );
    const anomalies = PatternDetector.detectAnomalies(transactions, patterns);
    const ghanaianPatterns =
      PatternDetector.detectGhanaianPatterns(transactions);

    await runIntelligencePipeline(supabase, user.userId, datasetId, {
      runRules: true,
      trigger: "pattern_analysis",
    });

    return apiSuccess({
      patterns,
      anomalies,
      ghanaianPatterns,
      saved: true,
      analysisPeriod: {
        lookbackDays,
        datasetId,
        totalTransactions: transactions.length,
        expenseTransactions: transactions.filter((t) => t.type === "expense")
          .length,
        incomeTransactions: transactions.filter((t) => t.type === "income")
          .length,
      },
    });
  } catch (error) {
    console.error("Pattern analysis error:", error);
    return apiError("Failed to analyze patterns", 500);
  }
}
