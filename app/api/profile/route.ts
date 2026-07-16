import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/api/helpers";
import { apiSuccess, apiError } from "@/lib/api";

export async function GET() {
  try {
    const { supabase, user } = await getAuthenticatedContext();
    if (!user) return apiError("Unauthorized", 401);

    const { data: profile, error } = await supabase
      .from("users")
      .select("id, email, full_name, preferences, created_at, updated_at")
      .eq("id", user.userId)
      .maybeSingle();

    if (error) throw error;

    return apiSuccess({
      userId: user.userId,
      email: profile?.email ?? user.email,
      fullName: profile?.full_name ?? "",
      preferences: profile?.preferences ?? {
        currency: "USD",
        timezone: "UTC",
        theme: "light",
      },
      createdAt: profile?.created_at,
      updatedAt: profile?.updated_at,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return apiError("Failed to fetch profile", 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedContext();
    if (!user) return apiError("Unauthorized", 401);

    const body = await request.json();
    const { fullName, preferences } = body;

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (fullName != null) {
      const trimmed = String(fullName).trim();
      if (!trimmed) return apiError("Name cannot be empty", 400);
      updates.full_name = trimmed;
    }

    if (preferences != null) {
      const { data: current } = await supabase
        .from("users")
        .select("preferences")
        .eq("id", user.userId)
        .maybeSingle();

      updates.preferences = {
        ...(current?.preferences ?? {}),
        ...preferences,
      };
    }

    const { data: profile, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", user.userId)
      .select("id, email, full_name, preferences")
      .single();

    if (error) throw error;

    if (updates.full_name) {
      await supabase.auth.updateUser({
        data: { full_name: updates.full_name },
      });
    }

    return apiSuccess({
      userId: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      preferences: profile.preferences,
      message: "Profile updated",
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return apiError("Failed to update profile", 500);
  }
}
