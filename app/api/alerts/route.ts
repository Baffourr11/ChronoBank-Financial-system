import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/api/helpers";
import { apiSuccess, apiError } from "@/lib/api";
import {
  getDatasetIdFromRequest,
  resolveDatasetId,
} from "@/lib/dataset/resolveDataset";

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedContext();
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const datasetId = await resolveDatasetId(supabase, user.userId,
      getDatasetIdFromRequest(searchParams),
    );
    let query = supabase
      .from("alerts")
      .select("*")
      .eq("user_id", user.userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (datasetId) query = query.eq("dataset_id", datasetId);
    if (unreadOnly) query = query.eq("is_read", false);

    const { data: alerts, error } = await query;
    if (error) throw error;

    return apiSuccess({
      datasetId,
      alerts: (alerts ?? []).map((a) => ({
        id: a.id,
        type: a.type,
        title: a.title,
        message: a.message,
        severity: a.severity,
        isRead: a.is_read,
        datasetId: a.dataset_id,
        ruleId: a.rule_id,
        data: a.data,
        createdAt: a.created_at,
      })),
    });
  } catch (error) {
    console.error("Get alerts error:", error);
    return apiError("Failed to fetch alerts", 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedContext();
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    const body = await request.json();
    const { alertId, isRead = true } = body;

    if (!alertId) {
      return apiError("alertId is required", 400);
    }
    const { data, error } = await supabase
      .from("alerts")
      .update({ is_read: isRead, updated_at: new Date().toISOString() })
      .eq("id", alertId)
      .eq("user_id", user.userId)
      .select("id, is_read")
      .single();

    if (error || !data) {
      return apiError("Alert not found", 404);
    }

    return apiSuccess({ id: data.id, isRead: data.is_read });
  } catch (error) {
    console.error("Update alert error:", error);
    return apiError("Failed to update alert", 500);
  }
}
