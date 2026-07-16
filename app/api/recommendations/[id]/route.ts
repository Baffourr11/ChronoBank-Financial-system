import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/api/helpers";
import { apiSuccess, apiError } from "@/lib/api";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { supabase, user } = await getAuthenticatedContext();
    if (!user) return apiError("Unauthorized", 401);

    const { id } = await params;
    const body = await request.json();
    const status = body.status as string;

    if (!["active", "dismissed", "applied"].includes(status)) {
      return apiError("Invalid status", 400);
    }

    const { data, error } = await supabase
      .from("recommendations")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.userId)
      .select("*")
      .single();

    if (error || !data) return apiError("Recommendation not found", 404);

    return apiSuccess({ recommendation: data });
  } catch (error) {
    console.error("Update recommendation error:", error);
    return apiError("Failed to update recommendation", 500);
  }
}
