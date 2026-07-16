import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Recompute each account balance from completed transactions in a dataset.
 */
export async function recalculateBalancesForDataset(
  supabase: SupabaseClient,
  userId: string,
  datasetId: string,
): Promise<void> {
  const { data: accounts, error: accError } = await supabase
    .from("accounts")
    .select("id")
    .eq("user_id", userId)
    .eq("dataset_id", datasetId);

  if (accError) throw accError;
  if (!accounts?.length) return;

  const { data: txs, error: txError } = await supabase
    .from("transactions")
    .select("account_id, type, amount")
    .eq("user_id", userId)
    .eq("dataset_id", datasetId)
    .eq("status", "completed");

  if (txError) throw txError;

  const balances = new Map<string, number>();
  for (const account of accounts) {
    balances.set(account.id, 0);
  }

  for (const tx of txs ?? []) {
    const amount = Number(tx.amount);
    const current = balances.get(tx.account_id) ?? 0;
    if (tx.type === "income") {
      balances.set(tx.account_id, current + amount);
    } else if (tx.type === "expense") {
      balances.set(tx.account_id, current - amount);
    }
  }

  const updatedAt = new Date().toISOString();
  await Promise.all(
    accounts.map((account) =>
      supabase
        .from("accounts")
        .update({
          balance: balances.get(account.id) ?? 0,
          updated_at: updatedAt,
        })
        .eq("id", account.id),
    ),
  );
}

export async function recalculateBalanceForAccount(
  supabase: SupabaseClient,
  userId: string,
  accountId: string,
  datasetId?: string,
): Promise<number> {
  let query = supabase
    .from("transactions")
    .select("type, amount")
    .eq("account_id", accountId)
    .eq("user_id", userId)
    .eq("status", "completed");

  if (datasetId) {
    query = query.eq("dataset_id", datasetId);
  }

  const { data: txs, error } = await query;
  if (error) throw error;

  let balance = 0;
  for (const tx of txs ?? []) {
    const amount = Number(tx.amount);
    if (tx.type === "income") balance += amount;
    else if (tx.type === "expense") balance -= amount;
  }

  await supabase
    .from("accounts")
    .update({
      balance,
      updated_at: new Date().toISOString(),
    })
    .eq("id", accountId);

  return balance;
}
