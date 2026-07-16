import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/api/helpers";
import { apiSuccess, apiError } from "@/lib/api";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { supabase, user } = await getAuthenticatedContext();
    if (!user) return apiError("Unauthorized", 401);

    const { id } = await params;
    const body = await request.json();

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (body.category != null) updates.category = body.category;
    if (body.limitAmount != null) updates.limit_amount = parseFloat(body.limitAmount);
    if (body.period != null) updates.period = body.period;
    if (body.alertThreshold != null) updates.alert_threshold = body.alertThreshold;

    const { data, error } = await supabase
      .from("budgets")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.userId)
      .select("*")
      .single();

    if (error || !data) return apiError("Budget not found", 404);

    return apiSuccess({ budget: data });
  } catch (error) {
    console.error("Update budget error:", error);
    return apiError("Failed to update budget", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { supabase, user } = await getAuthenticatedContext();
    if (!user) return apiError("Unauthorized", 401);

    const { id } = await params;

    const { error } = await supabase
      .from("budgets")
      .delete()
      .eq("id", id)
      .eq("user_id", user.userId);

    if (error) throw error;

    return apiSuccess({ message: "Budget deleted" });
  } catch (error) {
    console.error("Delete budget error:", error);
    return apiError("Failed to delete budget", 500);
  }
}
