import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { RuleEngine } from "../rules/RuleEngine";

export async function processScheduledRules() {
  try {
    console.log("Processing scheduled rules...");
    await RuleEngine.processScheduledRules();
    console.log("Scheduled rules processed successfully");
  } catch (error) {
    console.error("Error processing scheduled rules:", error);
  }
}

export async function processTransactionRules(
  userId: string,
  datasetId: string,
  transactionData: unknown,
) {
  try {
    const supabase = getSupabaseAdmin();
    await RuleEngine.processRules(
      supabase,
      userId,
      { type: "transaction", transaction: transactionData },
      datasetId,
    );
  } catch (error) {
    console.error("Error processing transaction rules:", error);
  }
}

export async function processAccountRules(
  userId: string,
  datasetId: string,
  accountData: unknown,
) {
  try {
    const supabase = getSupabaseAdmin();
    await RuleEngine.processRules(
      supabase,
      userId,
      { type: "account", account: accountData },
      datasetId,
    );
  } catch (error) {
    console.error("Error processing account rules:", error);
  }
}
