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
    if (!user) return apiError("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const datasetId = await resolveDatasetId(
      supabase,
      user.userId,
      getDatasetIdFromRequest(searchParams),
    );

    if (!datasetId) {
      return apiSuccess({ recommendations: [], datasetId: null });
    }

    const status = searchParams.get("status") || "active";

    const { data, error } = await supabase
      .from("recommendations")
      .select("*")
      .eq("user_id", user.userId)
      .eq("dataset_id", datasetId)
      .eq("status", status)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    return apiSuccess({ datasetId, recommendations: data ?? [] });
  } catch (error) {
    console.error("Get recommendations error:", error);
    return apiError("Failed to fetch recommendations", 500);
  }
}
