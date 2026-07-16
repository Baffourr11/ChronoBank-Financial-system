import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { apiSuccess, apiError } from "@/lib/api";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return apiError("Email and password are required", 400);
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });

    if (error || !data.user) {
      return apiError("Invalid email or password", 401);
    }

    let { data: profile } = await supabase
      .from("users")
      .select("full_name")
      .eq("id", data.user.id)
      .maybeSingle();

    if (!profile) {
      const admin = getSupabaseAdmin();
      const fullName =
        (data.user.user_metadata?.full_name as string) ||
        data.user.email?.split("@")[0] ||
        "User";
      await admin.from("users").upsert({
        id: data.user.id,
        email: data.user.email ?? "",
        full_name: fullName,
        preferences: { currency: "USD", timezone: "UTC", theme: "light" },
      });
      profile = { full_name: fullName };
    }

    return apiSuccess({
      userId: data.user.id,
      email: data.user.email,
      fullName: profile?.full_name ?? data.user.user_metadata?.full_name,
      message: "Login successful",
    });
  } catch (error) {
    console.error("Login error:", error);
    return apiError("Login failed", 500);
  }
}
