import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Resolves which dataset scope applies to a request.
 * 1. Explicit datasetId (query/body) if owned by user
 * 2. Else user's active dataset (is_active = true)
 * 3. Else latest dataset
 */
export async function resolveDatasetId(
  supabase: SupabaseClient,
  userId: string,
  explicitDatasetId?: string | null,
): Promise<string | null> {
  if (explicitDatasetId) {
    const { data } = await supabase
      .from("datasets")
      .select("id")
      .eq("id", explicitDatasetId)
      .eq("user_id", userId)
      .maybeSingle();

    if (data) return data.id;
    return null;
  }

  const { data: active } = await supabase
    .from("datasets")
    .select("id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (active) return active.id;

  const { data: latest } = await supabase
    .from("datasets")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return latest?.id ?? null;
}

export function getDatasetIdFromRequest(
  searchParams: URLSearchParams,
): string | null {
  return searchParams.get("datasetId");
}
