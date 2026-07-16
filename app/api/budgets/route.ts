import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/api/helpers";
import { apiSuccess, apiError } from "@/lib/api";
import {
  getDatasetIdFromRequest,
  resolveDatasetId,
} from "@/lib/dataset/resolveDataset";
import { RuleEngine } from "@/lib/rules/RuleEngine";
import {
  budgetPercentUsed,
  computeMonthlySpendByCategory,
  getMonthStart,
  spentForBudgetCategory,
} from "@/lib/finance/budgetSpend";

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
      return apiSuccess({ budgets: [], datasetId: null });
    }

    const { data: budgets, error } = await supabase
      .from("budgets")
      .select("*")
      .eq("user_id", user.userId)
      .eq("dataset_id", datasetId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const { data: expenses } = await supabase
      .from("transactions")
      .select("category, amount, type, date")
      .eq("user_id", user.userId)
      .eq("dataset_id", datasetId)
      .eq("type", "expense")
      .gte("date", getMonthStart().toISOString());

    const spentByCategory = computeMonthlySpendByCategory(
      (expenses ?? []).map((tx) => ({
        type: tx.type,
        category: tx.category,
        amount: Number(tx.amount),
        date: tx.date,
      })),
    );

    const enriched = (budgets ?? []).map((b) => {
      const spent = spentForBudgetCategory(spentByCategory, b.category);
      const limit = Number(b.limit_amount);
      const percent = budgetPercentUsed(spent, limit);
      return {
        ...b,
        spent,
        percentUsed: percent,
        remaining: Math.max(0, limit - spent),
        overBudget: spent > limit,
      };
    });

    return apiSuccess({ datasetId, budgets: enriched });
  } catch (error) {
    console.error("Get budgets error:", error);
    return apiError("Failed to fetch budgets", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedContext();
    if (!user) return apiError("Unauthorized", 401);

    const body = await request.json();
    const {
      category,
      limitAmount,
      period = "monthly",
      alertThreshold = 80,
      datasetId: bodyDatasetId,
    } = body;

    if (!category || limitAmount == null) {
      return apiError("Missing required fields: category, limitAmount", 400);
    }

    const datasetId = await resolveDatasetId(supabase, user.userId, bodyDatasetId);
    if (!datasetId) {
      return apiError("No active dataset", 400);
    }

    const { data, error } = await supabase
      .from("budgets")
      .insert({
        user_id: user.userId,
        dataset_id: datasetId,
        category,
        limit_amount: parseFloat(limitAmount),
        period,
        alert_threshold: alertThreshold,
      })
      .select("*")
      .single();

    if (error || !data) throw error;

    void RuleEngine.processRules(
      supabase,
      user.userId,
      { type: "budget_created", category },
      datasetId,
    );

    return apiSuccess({ budget: data }, 201);
  } catch (error) {
    console.error("Create budget error:", error);
    return apiError("Failed to create budget", 500);
  }
}
