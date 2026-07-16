import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildWalletState,
  type WalletState,
} from "@/lib/finance/computeWalletState";
import { buildBalanceContext } from "@/lib/finance/balanceContext";

export async function fetchWalletStateForDataset(
  supabase: SupabaseClient,
  userId: string,
  datasetId: string,
): Promise<WalletState> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const [
    { data: dataset },
    { data: accounts },
    { data: budgetRows },
    { data: monthExpenses },
    { data: ytdTransactions },
    { data: newestTx },
    { data: oldestTx },
    { data: predictions },
    { count: activeRules },
    { count: unreadAlerts },
    { data: recentExecs },
  ] = await Promise.all([
    supabase
      .from("datasets")
      .select("date_range_start, date_range_end")
      .eq("id", datasetId)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("accounts")
      .select("balance")
      .eq("user_id", userId)
      .eq("dataset_id", datasetId),
    supabase
      .from("budgets")
      .select("category, limit_amount")
      .eq("user_id", userId)
      .eq("dataset_id", datasetId),
    supabase
      .from("transactions")
      .select("category, amount")
      .eq("user_id", userId)
      .eq("dataset_id", datasetId)
      .eq("type", "expense")
      .eq("status", "completed")
      .gte("date", monthStart),
    supabase
      .from("transactions")
      .select("type, amount, date")
      .eq("user_id", userId)
      .eq("dataset_id", datasetId)
      .eq("status", "completed")
      .gte("date", yearStart),
    supabase
      .from("transactions")
      .select("date")
      .eq("user_id", userId)
      .eq("dataset_id", datasetId)
      .eq("status", "completed")
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("transactions")
      .select("date")
      .eq("user_id", userId)
      .eq("dataset_id", datasetId)
      .eq("status", "completed")
      .order("date", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("predictions")
      .select("prediction_type, predicted_value, metadata, confidence")
      .eq("user_id", userId)
      .eq("dataset_id", datasetId)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("rules")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("dataset_id", datasetId)
      .eq("is_active", true),
    supabase
      .from("alerts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("dataset_id", datasetId)
      .eq("is_read", false),
    supabase
      .from("rule_executions")
      .select("actions")
      .eq("user_id", userId)
      .gte("created_at", weekAgo)
      .limit(50),
  ]);

  const currentBalance = (accounts ?? []).reduce(
    (sum, a) => sum + Number(a.balance),
    0,
  );

  const spentByCategory: Record<string, number> = {};
  for (const tx of monthExpenses ?? []) {
    spentByCategory[tx.category] =
      (spentByCategory[tx.category] ?? 0) + Number(tx.amount);
  }

  const enrichedBudgets = (budgetRows ?? []).map((b) => {
    const spent = spentByCategory[b.category] ?? 0;
    const limit = Number(b.limit_amount);
    return {
      category: b.category,
      limit_amount: limit,
      spent,
      remaining: Math.max(0, limit - spent),
    };
  });

  let recentExecutions = 0;
  for (const exec of recentExecs ?? []) {
    const actions = exec.actions as { type?: string; status?: string }[] | null;
    if (!Array.isArray(actions)) continue;
    for (const a of actions) {
      if (a.type === "create_transaction" && a.status === "success") {
        recentExecutions += 1;
      }
    }
  }

  const balanceContext = buildBalanceContext(ytdTransactions ?? [], {
    start: dataset?.date_range_start,
    end: dataset?.date_range_end,
  });

  if (newestTx?.date) {
    balanceContext.balanceAsOf = new Date(newestTx.date).toISOString();
    const daysSince = Math.floor(
      (now.getTime() - new Date(newestTx.date).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    balanceContext.daysSinceLastTransaction = daysSince;
    balanceContext.isDataStale = daysSince > 30;
  }
  if (oldestTx?.date) {
    balanceContext.datasetRangeStart = new Date(oldestTx.date).toISOString();
  }
  if (newestTx?.date) {
    balanceContext.datasetRangeEnd = new Date(newestTx.date).toISOString();
  }

  return buildWalletState({
    currentBalance,
    budgets: enrichedBudgets,
    predictions: predictions ?? [],
    automation: {
      activeRules: activeRules ?? 0,
      unreadAlerts: unreadAlerts ?? 0,
      recentExecutions,
    },
    balanceContext,
  });
}
