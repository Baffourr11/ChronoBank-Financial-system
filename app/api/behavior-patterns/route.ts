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
      return apiSuccess({ patterns: [], datasetId: null });
    }

    const { data, error } = await supabase
      .from("behavior_patterns")
      .select("*")
      .eq("user_id", user.userId)
      .eq("dataset_id", datasetId)
      .order("confidence", { ascending: false });

    if (error) throw error;

    return apiSuccess({ datasetId, patterns: data ?? [] });
  } catch (error) {
    console.error("Get behavior patterns error:", error);
    return apiError("Failed to fetch behavior patterns", 500);
  }
}
