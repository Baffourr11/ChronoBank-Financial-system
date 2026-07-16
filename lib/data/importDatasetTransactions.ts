import type { SupabaseClient } from "@supabase/supabase-js";
import type { ParsedUploadTransaction } from "@/lib/data/parseUploadFile";
import { validateUploadTransaction } from "@/lib/data/parseUploadFile";

const INSERT_CHUNK_SIZE = 500;

export interface ImportTransactionsResult {
  imported: number;
  skipped: number;
  errors: string[];
}

/**
 * Ensure accounts exist only for this dataset, then bulk-insert transactions.
 */
export async function importTransactionsForDataset(
  supabase: SupabaseClient,
  userId: string,
  datasetId: string,
  transactions: ParsedUploadTransaction[],
): Promise<ImportTransactionsResult> {
  const accountMap = await ensureDatasetAccounts(
    supabase,
    userId,
    datasetId,
    transactions,
  );

  const rows: Array<Record<string, unknown>> = [];
  let skipped = 0;
  const errors: string[] = [];

  for (const tx of transactions) {
    const validation = validateUploadTransaction(tx);
    if (!validation.valid) {
      errors.push(validation.error || "Invalid transaction");
      skipped++;
      continue;
    }

    const accountName = tx.accountName?.trim() || "Main Account";
    const accountId = accountMap.get(accountName.toLowerCase());
    if (!accountId) {
      errors.push(`No account available for "${accountName}"`);
      skipped++;
      continue;
    }

    rows.push({
      user_id: userId,
      dataset_id: datasetId,
      account_id: accountId,
      type: tx.type,
      category: tx.category,
      amount: tx.amount,
      description: tx.description || `${tx.type} in ${tx.category}`,
      date: new Date(tx.date).toISOString(),
      tags: [],
      status: "completed",
    });
  }

  let imported = 0;
  for (let i = 0; i < rows.length; i += INSERT_CHUNK_SIZE) {
    const chunk = rows.slice(i, i + INSERT_CHUNK_SIZE);
    const { error } = await supabase.from("transactions").insert(chunk);
    if (error) {
      errors.push(
        `Batch insert failed (rows ${i + 1}-${i + chunk.length}): ${error.message}`,
      );
      skipped += chunk.length;
    } else {
      imported += chunk.length;
    }
  }

  return { imported, skipped, errors };
}

async function ensureDatasetAccounts(
  supabase: SupabaseClient,
  userId: string,
  datasetId: string,
  transactions: ParsedUploadTransaction[],
): Promise<Map<string, string>> {
  const accountMap = new Map<string, string>();

  const { data: existing, error } = await supabase
    .from("accounts")
    .select("id, name")
    .eq("user_id", userId)
    .eq("dataset_id", datasetId);

  if (error) throw error;

  for (const acc of existing ?? []) {
    accountMap.set(acc.name.toLowerCase(), acc.id);
  }

  const uniqueNames = new Set<string>();
  for (const tx of transactions) {
    uniqueNames.add((tx.accountName?.trim() || "Main Account").toLowerCase());
  }

  const toCreate: Array<{ name: string; key: string }> = [];
  for (const key of uniqueNames) {
    if (!accountMap.has(key)) {
      const displayName =
        transactions.find(
          (t) => (t.accountName?.trim() || "Main Account").toLowerCase() === key,
        )?.accountName?.trim() || "Main Account";
      toCreate.push({
        name: displayName,
        key,
      });
    }
  }

  if (toCreate.length > 0) {
    const { data: created, error: createError } = await supabase
      .from("accounts")
      .insert(
        toCreate.map((item) => ({
          user_id: userId,
          dataset_id: datasetId,
          name: item.name,
          type: "checking",
          balance: 0,
          currency: "GHS",
        })),
      )
      .select("id, name");

    if (createError) throw createError;

    for (const acc of created ?? []) {
      accountMap.set(acc.name.toLowerCase(), acc.id);
    }
  }

  if (accountMap.size === 0) {
    const { data: fallback, error: fallbackError } = await supabase
      .from("accounts")
      .insert({
        user_id: userId,
        dataset_id: datasetId,
        name: "Main Account",
        type: "checking",
        balance: 0,
        currency: "GHS",
      })
      .select("id, name")
      .single();

    if (fallbackError || !fallback) throw fallbackError;
    accountMap.set(fallback.name.toLowerCase(), fallback.id);
  }

  return accountMap;
}

export async function activateDatasetForUser(
  supabase: SupabaseClient,
  userId: string,
  datasetId: string,
): Promise<void> {
  await supabase
    .from("datasets")
    .update({ is_active: false })
    .eq("user_id", userId)
    .neq("id", datasetId);

  await supabase
    .from("datasets")
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq("id", datasetId)
    .eq("user_id", userId);
}
