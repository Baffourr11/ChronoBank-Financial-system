import { createClient } from "@/lib/supabase/server";
import type { AuthUser } from "@/lib/auth";

export async function getAuthenticatedContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null as AuthUser | null };
  }

  return {
    supabase,
    user: { userId: user.id, email: user.email ?? "" },
  };
}
