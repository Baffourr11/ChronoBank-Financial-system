import type { SupabaseClient } from "@supabase/supabase-js";
import { refreshDatasetIntelligence } from "@/lib/intelligence/persistInsights";
import { RuleEngine } from "@/lib/rules/RuleEngine";
import { runAutomationLayer } from "@/lib/automation/runAutomationLayer";
import type { AutomationLayerResult } from "@/lib/automation/types";

export type ChainReactionEvent =
  | {
      type: "transaction";
      isLarge?: boolean;
      amount?: number;
      category?: string;
      transaction?: Record<string, unknown>;
    }
  | { type: "data_import" }
  | { type: "manual_run" }
  | { type: "forecast" }
  | { type: "pattern_analysis" }
  | { type: "dataset_upload" }
  | { type: "sample_data" }
  | { type: "intelligence_refresh" };

export interface ChainReactionOptions {
  runRules?: boolean;
  skipIntelligence?: boolean;
}

export interface ChainReactionResult {
  intelligenceRefreshed: boolean;
  automation: AutomationLayerResult | null;
  rulesProcessed: boolean;
}

const LARGE_EXPENSE_RATIO = 0.1;
const LARGE_EXPENSE_MIN = 500;

/**
 * Chain-reaction: refresh data → automation layer → rules.
 * Used after material events (import, large expense, manual analysis).
 */
export async function runChainReaction(
  supabase: SupabaseClient,
  userId: string,
  datasetId: string,
  event: ChainReactionEvent,
  options: ChainReactionOptions = {},
): Promise<ChainReactionResult> {
  const { runRules = true, skipIntelligence = false } = options;

  let automation: AutomationLayerResult | null = null;
  let intelligenceRefreshed = false;

  if (!skipIntelligence) {
    const snapshot = await refreshDatasetIntelligence(
      supabase,
      userId,
      datasetId,
    );
    intelligenceRefreshed = snapshot != null;

    if (snapshot) {
      const { data: budgetRows } = await supabase
        .from("budgets")
        .select("id, category, limit_amount, period, alert_threshold")
        .eq("user_id", userId)
        .eq("dataset_id", datasetId);

      automation = await runAutomationLayer(
        supabase,
        userId,
        datasetId,
        snapshot,
        (budgetRows ?? []).map((b) => ({
          id: b.id,
          category: b.category,
          limit_amount: Number(b.limit_amount),
          period: b.period,
          alert_threshold: Number(b.alert_threshold),
        })),
      );
    }
  }

  if (runRules) {
    const triggerPayload: Record<string, unknown> = { type: event.type };
    if (event.type === "transaction") {
      triggerPayload.isLarge = event.isLarge;
      triggerPayload.amount = event.amount;
      triggerPayload.category = event.category;
      if (event.transaction) {
        triggerPayload.transaction = event.transaction;
      }
    }
    await RuleEngine.processRules(
      supabase,
      userId,
      triggerPayload,
      datasetId,
    );
  }

  return {
    intelligenceRefreshed,
    automation,
    rulesProcessed: runRules,
  };
}

export function isLargeExpense(
  amount: number,
  type: string,
  totalBalance: number,
): boolean {
  if (type !== "expense") return false;
  if (amount >= LARGE_EXPENSE_MIN && amount >= totalBalance * LARGE_EXPENSE_RATIO) {
    return true;
  }
  return amount >= LARGE_EXPENSE_MIN * 2;
}
