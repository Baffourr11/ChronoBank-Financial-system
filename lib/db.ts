import { getSupabaseAdmin } from "@/lib/supabase/admin";

/** @deprecated Use getSupabaseAdmin() — kept for minimal call-site churn during migration */
export async function connectToDatabase() {
  return getSupabaseAdmin();
}

export function getDatabase() {
  return getSupabaseAdmin();
}
