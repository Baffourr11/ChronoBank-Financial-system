import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { apiSuccess, apiError } from "@/lib/api";

async function ensureProfileRow(
  userId: string,
  email: string,
  fullName: string,
) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("users").upsert(
    {
      id: userId,
      email,
      full_name: fullName,
      preferences: { currency: "USD", timezone: "UTC", theme: "light" },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    console.error("Profile upsert error:", error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, fullName, password, confirmPassword } = body;

    if (!email || !fullName || !password) {
      return apiError("Missing required fields", 400);
    }

    if (password !== confirmPassword) {
      return apiError("Passwords do not match", 400);
    }

    if (password.length < 6) {
      return apiError("Password must be at least 6 characters", 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return apiError("Invalid email format", 400);
    }

    const supabase = await createClient();
    const normalizedEmail = email.toLowerCase().trim();
    const trimmedName = fullName.trim();

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: trimmedName,
          preferences: { currency: "USD", timezone: "UTC", theme: "light" },
        },
      },
    });

    if (error) {
      console.error("Registration error:", error);

      if (
        error.message?.includes("Database error saving new user") ||
        error.code === "unexpected_failure"
      ) {
        return apiError(
          "Account setup failed in the database. Run supabase/migrations/004_fix_auth_signup.sql in the Supabase SQL Editor, then try again.",
          400,
        );
      }

      return apiError(error.message || "Registration failed", 400);
    }

    if (!data.user) {
      return apiError("Registration failed", 500);
    }

    await ensureProfileRow(data.user.id, normalizedEmail, trimmedName);

    return apiSuccess(
      {
        userId: data.user.id,
        email: normalizedEmail,
        fullName: trimmedName,
        message: data.session
          ? "Registration successful"
          : "Registration successful. Check your email to confirm your account if confirmation is enabled.",
      },
      201,
    );
  } catch (error) {
    console.error("Registration error:", error);
    return apiError("Registration failed", 500);
  }
}
