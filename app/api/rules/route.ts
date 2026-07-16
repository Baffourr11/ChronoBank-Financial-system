import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/api/helpers";
import { apiSuccess, apiError } from "@/lib/api";
import { toIRule } from "@/lib/mappers";
import {
  getDatasetIdFromRequest,
  resolveDatasetId,
} from "@/lib/dataset/resolveDataset";
import type { RuleExecutionRow, RuleRow } from "@/lib/supabase/types";
import { RuleEngine } from "@/lib/rules/RuleEngine";

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedContext();
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const includeExecutions = searchParams.get("includeExecutions") === "true";
    const datasetId = await resolveDatasetId(supabase, user.userId,
      getDatasetIdFromRequest(searchParams),
    );
    let query = supabase
      .from("rules")
      .select("*")
      .eq("user_id", user.userId)
      .order("created_at", { ascending: false });

    if (datasetId) {
      query = query.eq("dataset_id", datasetId);
    }

    const { data: rules, error } = await query;
    if (error) throw error;

    let result = ((rules ?? []) as RuleRow[]).map((rule) => {
      const mapped = toIRule(rule);
      return {
        id: mapped._id!,
        datasetId: mapped.datasetId,
        name: mapped.name,
        description: mapped.description,
        isActive: mapped.isActive,
        priority: mapped.priority,
        conditions: mapped.conditions,
        actions: mapped.actions,
        schedule: mapped.schedule,
        executionCount: mapped.executionCount,
        lastExecuted: mapped.lastExecuted,
        createdAt: mapped.createdAt,
        updatedAt: mapped.updatedAt,
      };
    });

    if (includeExecutions) {
      let execQuery = supabase
        .from("rule_executions")
        .select("*")
        .eq("user_id", user.userId)
        .order("created_at", { ascending: false })
        .limit(100);

      const { data: executions } = await execQuery;

      const ruleIds = new Set(result.map((r) => r.id));
      const filteredExecs = ((executions ?? []) as RuleExecutionRow[]).filter(
        (e) => ruleIds.has(e.rule_id),
      );

      const executionsByRule = filteredExecs.reduce(
        (acc, execution) => {
          const ruleId = execution.rule_id;
          if (!acc[ruleId]) acc[ruleId] = [];
          acc[ruleId].push({
            id: execution.id,
            triggeredBy: execution.triggered_by,
            conditionsMet: execution.conditions_met,
            actionsExecuted: execution.actions_executed,
            status: execution.status,
            error: execution.error,
            executionTime: execution.execution_time,
            createdAt: execution.created_at,
          });
          return acc;
        },
        {} as Record<string, unknown[]>,
      );

      result = result.map((rule) => ({
        ...rule,
        executions: executionsByRule[rule.id] || [],
      }));
    }

    return apiSuccess(result);
  } catch (error) {
    console.error("Get rules error:", error);
    return apiError("Failed to fetch rules", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedContext();
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    const body = await request.json();
    const {
      name,
      description,
      conditions,
      actions,
      schedule,
      priority = 5,
      datasetId: bodyDatasetId,
    } = body;

    if (!name || !conditions || !actions || !schedule) {
      return apiError("Missing required fields", 400);
    }

    const datasetId = await resolveDatasetId(supabase, user.userId, bodyDatasetId);
    if (!datasetId) {
      return apiError("No active dataset. Select a dataset before creating rules.", 400);
    }
    const { data: newRule, error } = await supabase
      .from("rules")
      .insert({
        user_id: user.userId,
        dataset_id: datasetId,
        name,
        description,
        conditions,
        actions,
        schedule,
        priority,
        is_active: true,
        execution_count: 0,
      })
      .select("*")
      .single();

    if (error || !newRule) throw error;

    const runResult = await RuleEngine.runSingleRule(
      supabase,
      user.userId,
      newRule.id,
      { type: "rule_created" },
    );

    return apiSuccess(
      {
        id: newRule.id,
        datasetId,
        name,
        description,
        conditions,
        actions,
        schedule,
        priority,
        isActive: true,
        executionCount: 0,
        createdAt: newRule.created_at,
        firstRun: runResult,
      },
      201,
    );
  } catch (error) {
    console.error("Create rule error:", error);
    return apiError("Failed to create rule", 500);
  }
}
