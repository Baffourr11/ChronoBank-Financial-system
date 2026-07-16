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
      return apiSuccess({ predictions: [], datasetId: null });
    }

    const { data, error } = await supabase
      .from("predictions")
      .select("*")
      .eq("user_id", user.userId)
      .eq("dataset_id", datasetId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return apiSuccess({ datasetId, predictions: data ?? [] });
  } catch (error) {
    console.error("Get predictions error:", error);
    return apiError("Failed to fetch predictions", 500);
  }
}
