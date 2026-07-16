import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeCategoryName } from "@/lib/finance/budgetSpend";

export interface InsertAlertPayload {
  user_id: string;
  dataset_id: string | null;
  rule_id?: string | null;
  type: string;
  title: string;
  message: string;
  severity: "low" | "medium" | "high";
  data?: Record<string, unknown>;
}

export function buildAlertDedupeKey(
  type: string,
  category?: string | null,
): string {
  if (category) {
    return `${type}:${normalizeCategoryName(category).toLowerCase()}`;
  }
  return type;
}

function isManualTrigger(triggerType?: string): boolean {
  return triggerType === "manual" || triggerType === "manual_run";
}

/**
 * Inserts an alert unless an identical unread one already exists.
 * Manual "Run" on a rule always creates a new alert (user requested repeat).
 */
export async function insertDedupedAlert(
  supabase: SupabaseClient,
  payload: InsertAlertPayload,
  options: {
    triggerType?: string;
    category?: string | null;
  } = {},
): Promise<{ inserted: boolean; alertId?: string; skipped?: boolean }> {
  const dedupeKey = buildAlertDedupeKey(
    payload.type,
    options.category ?? (payload.data?.category as string | undefined),
  );
  const data = { ...payload.data, dedupeKey };

  const forceInsert = isManualTrigger(options.triggerType);

  if (!forceInsert && payload.dataset_id) {
    const { data: existing, error } = await supabase
      .from("alerts")
      .select("id")
      .eq("user_id", payload.user_id)
      .eq("dataset_id", payload.dataset_id)
      .eq("is_read", false)
      .filter("data->>dedupeKey", "eq", dedupeKey)
      .limit(1);

    if (!error && existing && existing.length > 0) {
      return { inserted: false, skipped: true, alertId: existing[0].id };
    }
  }

  const { data: alert, error } = await supabase
    .from("alerts")
    .insert({
      user_id: payload.user_id,
      dataset_id: payload.dataset_id,
      rule_id: payload.rule_id ?? null,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      severity: payload.severity,
      is_read: false,
      data,
    })
    .select("id")
    .single();

  if (error) throw error;

  return { inserted: true, alertId: alert?.id };
}
