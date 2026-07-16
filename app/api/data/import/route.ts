import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/api/helpers";
import { apiSuccess, apiError } from "@/lib/api";
import { ANALYTICS_CONFIG } from "@/lib/analytics/config";
import {
  getDatasetIdFromRequest,
  resolveDatasetId,
} from "@/lib/dataset/resolveDataset";
import { recalculateBalancesForDataset } from "@/lib/finance/recalculateBalances";
import { runIntelligencePipeline } from "@/lib/intelligence/pipeline";

interface ImportTransaction {
  date: string;
  type: "income" | "expense" | "transfer";
  category: string;
  amount: number;
  description?: string;
  accountName?: string;
  tags?: string[];
}

interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  errors: string[];
  accounts: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedContext();
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    const body = await request.json();
    const { transactions, options = {}, datasetId: bodyDatasetId } = body;

    if (!Array.isArray(transactions)) {
      return apiError("Transactions must be an array", 400);
    }

    const datasetId = await resolveDatasetId(supabase, user.userId, bodyDatasetId);
    let accountsQuery = supabase
      .from("accounts")
      .select("id, name")
      .eq("user_id", user.userId);

    if (datasetId) {
      accountsQuery = accountsQuery.eq("dataset_id", datasetId);
    }

    const { data: accounts } = await accountsQuery;

    const accountMap = new Map<string, string>();
    (accounts ?? []).forEach((acc) => {
      accountMap.set(acc.name.toLowerCase(), acc.id);
    });

    const result: ImportResult = {
      total: transactions.length,
      imported: 0,
      skipped: 0,
      errors: [],
      accounts: [],
    };

    const batchSize = options.batchSize || 100;
    const defaultAccountId = accounts?.[0]?.id;

    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize) as ImportTransaction[];

      for (const [batchIndex, tx] of batch.entries()) {
        const index = i + batchIndex;
        try {
          const validationResult = validateTransaction(tx);
          if (!validationResult.valid) {
            result.errors.push(`Transaction ${index + 1}: ${validationResult.error}`);
            result.skipped++;
            continue;
          }

          let accountId: string | undefined;
          if (tx.accountName) {
            accountId = accountMap.get(tx.accountName.toLowerCase());
            if (!accountId && options.createMissingAccounts) {
              const { data: newAccount, error } = await supabase
                .from("accounts")
                .insert({
                  user_id: user.userId,
                  dataset_id: datasetId,
                  name: tx.accountName,
                  type: "checking",
                  balance: 0,
                  currency: "GHS",
                })
                .select("id, name")
                .single();

              if (error || !newAccount) throw error;

              accountId = newAccount.id;
              accountMap.set(tx.accountName.toLowerCase(), accountId);
              result.accounts.push(tx.accountName);
            }
          }

          if (options.skipDuplicates) {
            let dupQuery = supabase
              .from("transactions")
              .select("id")
              .eq("user_id", user.userId)
              .eq("date", new Date(tx.date).toISOString())
              .eq("type", tx.type)
              .eq("category", tx.category)
              .eq("amount", tx.amount)
              .eq("description", tx.description || "");

            if (datasetId) {
              dupQuery = dupQuery.eq("dataset_id", datasetId);
            }

            const { data: existingTx } = await dupQuery.maybeSingle();

            if (existingTx) {
              result.skipped++;
              continue;
            }
          }

          const resolvedAccountId = accountId || defaultAccountId;
          if (!resolvedAccountId) {
            result.errors.push(`Transaction ${index + 1}: No account available`);
            result.skipped++;
            continue;
          }

          const { error: insertError } = await supabase.from("transactions").insert({
            user_id: user.userId,
            dataset_id: datasetId,
            account_id: resolvedAccountId,
            type: tx.type,
            category: tx.category,
            amount: tx.amount,
            description: tx.description || `${tx.type} in ${tx.category}`,
            date: new Date(tx.date).toISOString(),
            tags: tx.tags || [],
            status: "completed",
          });

          if (insertError) throw insertError;
          result.imported++;
        } catch (error) {
          result.errors.push(
            `Transaction ${index + 1}: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
          result.skipped++;
        }
      }
    }

    if (datasetId && result.imported > 0) {
      await recalculateBalancesForDataset(supabase, user.userId, datasetId);
      void runIntelligencePipeline(supabase, user.userId, datasetId, {
        runRules: true,
        trigger: "data_import",
      });
    }

    return apiSuccess({
      ...result,
      datasetId,
      message: `Imported ${result.imported} of ${result.total} transactions`,
    });
  } catch (error) {
    console.error("Import error:", error);
    return apiError("Failed to import transactions", 500);
  }
}

function validateTransaction(tx: ImportTransaction): { valid: boolean; error?: string } {
  if (!tx.date) {
    return { valid: false, error: "Date is required" };
  }

  if (!tx.type || !["income", "expense", "transfer"].includes(tx.type)) {
    return { valid: false, error: "Type must be 'income', 'expense', or 'transfer'" };
  }

  if (!tx.category || tx.category.trim().length === 0) {
    return { valid: false, error: "Category is required" };
  }

  if (!tx.amount || tx.amount <= 0) {
    return { valid: false, error: "Amount must be greater than 0" };
  }

  const date = new Date(tx.date);
  if (isNaN(date.getTime())) {
    return { valid: false, error: "Invalid date format" };
  }

  const maxFutureDate = new Date();
  maxFutureDate.setDate(maxFutureDate.getDate() + 30);
  if (date > maxFutureDate) {
    return { valid: false, error: "Date cannot be more than 30 days in the future" };
  }

  const minPastDate = new Date();
  minPastDate.setFullYear(minPastDate.getFullYear() - 5);
  if (date < minPastDate) {
    return { valid: false, error: "Date cannot be more than 5 years in the past" };
  }

  return { valid: true };
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedContext();
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const datasetId = await resolveDatasetId(supabase, user.userId,
      getDatasetIdFromRequest(searchParams),
    );

    let countQuery = supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.userId);

    let oldestQuery = supabase
      .from("transactions")
      .select("date")
      .eq("user_id", user.userId)
      .order("date", { ascending: true })
      .limit(1);

    let newestQuery = supabase
      .from("transactions")
      .select("date")
      .eq("user_id", user.userId)
      .order("date", { ascending: false })
      .limit(1);

    if (datasetId) {
      countQuery = countQuery.eq("dataset_id", datasetId);
      oldestQuery = oldestQuery.eq("dataset_id", datasetId);
      newestQuery = newestQuery.eq("dataset_id", datasetId);
    }

    const { count: totalTransactions } = await countQuery;
    const { data: oldestTransaction } = await oldestQuery.maybeSingle();
    const { data: newestTransaction } = await newestQuery.maybeSingle();

    const dataRange = {
      start: oldestTransaction?.date,
      end: newestTransaction?.date,
      totalDays:
        oldestTransaction && newestTransaction
          ? Math.ceil(
              (new Date(newestTransaction.date).getTime() -
                new Date(oldestTransaction.date).getTime()) /
                (1000 * 60 * 60 * 24),
            )
          : 0,
    };

    const total = totalTransactions ?? 0;
    const hasEnoughData =
      total >= ANALYTICS_CONFIG.PATTERN_DETECTION.MIN_DATA_POINTS;
    const hasHistoricalData = dataRange.totalDays >= 90;

    return apiSuccess({
      statistics: {
        totalTransactions: total,
        dataRange,
        hasEnoughData,
        hasHistoricalData,
      },
      recommendations: {
        needsMoreData: total < ANALYTICS_CONFIG.PATTERN_DETECTION.MIN_DATA_POINTS,
        recommendedMinTransactions:
          ANALYTICS_CONFIG.PATTERN_DETECTION.MIN_DATA_POINTS,
        needsLongerHistory: dataRange.totalDays < 90,
        recommendedMinDays: 90,
      },
    });
  } catch (error) {
    console.error("Import stats error:", error);
    return apiError("Failed to get import statistics", 500);
  }
}
