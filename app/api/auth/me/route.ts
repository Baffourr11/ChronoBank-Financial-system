import { createClient } from "@/lib/supabase/server";
import { apiSuccess, apiError } from "@/lib/api";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError("Unauthorized", 401);
    }

    const { data: profile, error } = await supabase
      .from("users")
      .select("id, email, full_name, preferences")
      .eq("id", user.id)
      .maybeSingle();

    if (error || !profile) {
      return apiSuccess({
        userId: user.id,
        email: user.email,
        fullName: user.user_metadata?.full_name ?? "User",
        preferences: user.user_metadata?.preferences ?? {
          currency: "USD",
          timezone: "UTC",
          theme: "light",
        },
      });
    }

    return apiSuccess({
      userId: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      preferences: profile.preferences,
    });
  } catch (error) {
    console.error("Get user error:", error);
    return apiError("Failed to fetch user", 500);
  }
}
