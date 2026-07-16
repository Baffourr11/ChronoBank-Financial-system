import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/api/helpers";
import { apiSuccess, apiError } from "@/lib/api";
import {
  getDatasetIdFromRequest,
  resolveDatasetId,
} from "@/lib/dataset/resolveDataset";
import { runIntelligencePipeline } from "@/lib/intelligence/pipeline";

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedContext();
    if (!user) return apiError("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    let datasetId = getDatasetIdFromRequest(searchParams);

    if (!datasetId) {
      try {
        const body = await request.json();
        datasetId = body.datasetId ?? null;
      } catch {
        /* no body */
      }
    }

    const resolvedId = await resolveDatasetId(supabase, user.userId, datasetId);
    if (!resolvedId) {
      return apiError("No dataset selected", 400);
    }

    const result = await runIntelligencePipeline(
      supabase,
      user.userId,
      resolvedId,
      { runRules: true, trigger: "manual_run" },
    );

    return apiSuccess({
      datasetId: resolvedId,
      ...result,
      message: "Intelligence pipeline completed",
    });
  } catch (error) {
    console.error("Intelligence run error:", error);
    return apiError("Failed to run intelligence pipeline", 500);
  }
}
