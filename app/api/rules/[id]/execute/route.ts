import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/api/helpers";
import { apiSuccess, apiError } from "@/lib/api";
import { RuleEngine } from "@/lib/rules/RuleEngine";
import {
  getDatasetIdFromRequest,
  resolveDatasetId,
} from "@/lib/dataset/resolveDataset";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { supabase, user } = await getAuthenticatedContext();
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    const { id: ruleId } = await params;
    const { searchParams } = new URL(request.url);
    const datasetId = await resolveDatasetId(
      supabase,
      user.userId,
      getDatasetIdFromRequest(searchParams),
    );
    let ruleQuery = supabase
      .from("rules")
      .select("id, dataset_id")
      .eq("id", ruleId)
      .eq("user_id", user.userId);

    if (datasetId) {
      ruleQuery = ruleQuery.eq("dataset_id", datasetId);
    }

    const { data: rule, error } = await ruleQuery.maybeSingle();

    if (error || !rule) {
      return apiError("Rule not found", 404);
    }

    const scopeDatasetId = rule.dataset_id ?? datasetId;

    const result = await RuleEngine.runSingleRule(
      supabase,
      user.userId,
      ruleId,
      { type: "manual" },
    );

    if (!result) {
      return apiError("Rule not found", 404);
    }

    return apiSuccess({
      ...result,
      message: result.fired
        ? "Rule ran and actions were executed."
        : result.failedCondition
          ? `Rule did not run: ${result.failedCondition}`
          : "Rule conditions were not met.",
    });
  } catch (error) {
    console.error("Execute rule error:", error);
    return apiError("Failed to execute rule", 500);
  }
}
