import type { SupabaseClient } from "@supabase/supabase-js";
import { recalculateBalancesForDataset } from "@/lib/finance/recalculateBalances";

/**
 * Re-link transactions whose account_id belongs to another dataset,
 * then recalculate balances. Safe to run on every dataset activation.
 */
export async function repairDatasetAccounts(
  supabase: SupabaseClient,
  userId: string,
  datasetId: string,
): Promise<void> {
  const { data: datasetAccounts, error: accError } = await supabase
    .from("accounts")
    .select("id, name")
    .eq("user_id", userId)
    .eq("dataset_id", datasetId);

  if (accError) throw accError;

  const accountIds = new Set((datasetAccounts ?? []).map((a) => a.id));
  let defaultAccountId = datasetAccounts?.[0]?.id;

  if (!defaultAccountId) {
    const { data: created, error: createError } = await supabase
      .from("accounts")
      .insert({
        user_id: userId,
        dataset_id: datasetId,
        name: "Main Account",
        type: "checking",
        balance: 0,
        currency: "GHS",
      })
      .select("id")
      .single();

    if (createError || !created) throw createError;
    defaultAccountId = created.id;
    accountIds.add(created.id);
  }

  const { data: orphaned, error: txError } = await supabase
    .from("transactions")
    .select("id, account_id")
    .eq("user_id", userId)
    .eq("dataset_id", datasetId);

  if (txError) throw txError;

  const toRepair = (orphaned ?? []).filter((tx) => !accountIds.has(tx.account_id));
  if (toRepair.length === 0) {
    await recalculateBalancesForDataset(supabase, userId, datasetId);
    return;
  }

  const ids = toRepair.map((tx) => tx.id);
  const chunkSize = 500;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const { error: updateError } = await supabase
      .from("transactions")
      .update({ account_id: defaultAccountId })
      .in("id", chunk);
    if (updateError) throw updateError;
  }

  await recalculateBalancesForDataset(supabase, userId, datasetId);
}
