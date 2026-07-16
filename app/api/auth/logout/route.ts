import { createClient } from "@/lib/supabase/server";
import { apiSuccess, apiError } from "@/lib/api";

export async function POST() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      return apiError("Logout failed", 500);
    }
    return apiSuccess({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    return apiError("Logout failed", 500);
  }
}
