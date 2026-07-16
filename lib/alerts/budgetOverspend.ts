import type { SupabaseClient } from "@supabase/supabase-js";
import { insertDedupedAlert } from "@/lib/alerts/dedupe";

interface OverspendTransaction {
  id: string;
  type: string;
  category: string;
  amount: number;
  date: string;
  description?: string | null;
}

/**
 * Creates an in-app alert when an expense pushes a category over its monthly budget.
 */
export async function maybeCreateBudgetOverspendAlert(
  supabase: SupabaseClient,
  userId: string,
  datasetId: string,
  transaction: OverspendTransaction,
): Promise<void> {
  if (transaction.type !== "expense" || !transaction.category) return;

  const { data: budget } = await supabase
    .from("budgets")
    .select("id, category, limit_amount, alert_threshold")
    .eq("user_id", userId)
    .eq("dataset_id", datasetId)
    .ilike("category", transaction.category)
    .maybeSingle();

  if (!budget) return;

  const limit = Number(budget.limit_amount);
  if (limit <= 0) return;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data: monthExpenses } = await supabase
    .from("transactions")
    .select("id, amount")
    .eq("user_id", userId)
    .eq("dataset_id", datasetId)
    .eq("type", "expense")
    .eq("status", "completed")
    .ilike("category", transaction.category)
    .gte("date", monthStart);

  const totalSpent = (monthExpenses ?? []).reduce(
    (sum, row) => sum + Number(row.amount),
    0,
  );
  const spentBefore = totalSpent - transaction.amount;
  const percentUsed = (totalSpent / limit) * 100;
  const threshold = Number(budget.alert_threshold) || 80;

  const crossedLimit = spentBefore <= limit && totalSpent > limit;
  const crossedThreshold =
    spentBefore / limit < threshold / 100 &&
    percentUsed >= threshold;

  if (!crossedLimit && !crossedThreshold) return;

  const dateStr = new Date(transaction.date).toISOString().split("T")[0];
  const dayLabel = new Date(transaction.date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const title = crossedLimit
    ? `Over budget: ${budget.category}`
    : `Budget warning: ${budget.category}`;
  const message = crossedLimit
    ? `${budget.category} spending reached GHS ${totalSpent.toLocaleString()} (limit GHS ${limit.toLocaleString()}) after a GHS ${transaction.amount.toLocaleString()} expense on ${dayLabel}.`
    : `${budget.category} has used ${percentUsed.toFixed(0)}% of its monthly budget after spending on ${dayLabel}.`;

  await insertDedupedAlert(
    supabase,
    {
      user_id: userId,
      dataset_id: datasetId,
      rule_id: null,
      type: "budget_exceeded",
      title,
      message,
      severity: crossedLimit ? "high" : "medium",
      data: {
        navigateTo: "timeline",
        transactionDate: dateStr,
        transactionId: transaction.id,
        category: budget.category,
        amount: transaction.amount,
        percentUsed,
        limit,
      },
    },
    { category: budget.category, triggerType: "transaction" },
  );
}
