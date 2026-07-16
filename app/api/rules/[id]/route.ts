import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/api/helpers";
import { apiSuccess, apiError } from "@/lib/api";
import { toIRule } from "@/lib/mappers";
import type { RuleExecutionRow, RuleRow } from "@/lib/supabase/types";
import { RuleEngine } from "@/lib/rules/RuleEngine";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { supabase, user } = await getAuthenticatedContext();
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    const { id: ruleId } = await params;

    const { data: rule, error } = await supabase
      .from("rules")
      .select("*")
      .eq("id", ruleId)
      .eq("user_id", user.userId)
      .maybeSingle();

    if (error || !rule) {
      return apiError("Rule not found", 404);
    }

    const { data: executions } = await supabase
      .from("rule_executions")
      .select("*")
      .eq("rule_id", ruleId)
      .eq("user_id", user.userId)
      .order("created_at", { ascending: false })
      .limit(50);

    const mapped = toIRule(rule as RuleRow);

    return apiSuccess({
      id: mapped._id!,
      name: mapped.name,
      description: mapped.description,
      isActive: mapped.isActive,
      priority: mapped.priority,
      conditions: mapped.conditions,
      actions: mapped.actions,
      schedule: mapped.schedule,
      executionCount: mapped.executionCount,
      lastExecuted: mapped.lastExecuted,
      executions: ((executions ?? []) as RuleExecutionRow[]).map((exec) => ({
        id: exec.id,
        triggeredBy: exec.triggered_by,
        conditionsMet: exec.conditions_met,
        actionsExecuted: exec.actions_executed,
        status: exec.status,
        error: exec.error,
        executionTime: exec.execution_time,
        createdAt: exec.created_at,
      })),
      createdAt: mapped.createdAt,
      updatedAt: mapped.updatedAt,
    });
  } catch (error) {
    console.error("Get rule error:", error);
    return apiError("Failed to fetch rule", 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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
      priority,
      isActive,
    } = body;

    const { id: ruleId } = await params;

    const { data: existing, error: findError } = await supabase
      .from("rules")
      .select("*")
      .eq("id", ruleId)
      .eq("user_id", user.userId)
      .maybeSingle();

    if (findError || !existing) {
      return apiError("Rule not found", 404);
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (conditions !== undefined) updates.conditions = conditions;
    if (actions !== undefined) updates.actions = actions;
    if (schedule !== undefined) updates.schedule = schedule;
    if (priority !== undefined) updates.priority = priority;
    if (isActive !== undefined) updates.is_active = isActive;

    const { data: rule, error } = await supabase
      .from("rules")
      .update(updates)
      .eq("id", ruleId)
      .select("*")
      .single();

    if (error || !rule) {
      throw error;
    }

    const mapped = toIRule(rule as RuleRow);

    const runResult =
      mapped.isActive
        ? await RuleEngine.runSingleRule(supabase, user.userId, ruleId, {
            type: "rule_updated",
          })
        : null;

    return apiSuccess({
      id: mapped._id!,
      name: mapped.name,
      description: mapped.description,
      isActive: mapped.isActive,
      priority: mapped.priority,
      conditions: mapped.conditions,
      actions: mapped.actions,
      schedule: mapped.schedule,
      executionCount: mapped.executionCount,
      lastExecuted: mapped.lastExecuted,
      updatedAt: mapped.updatedAt,
      runResult,
    });
  } catch (error) {
    console.error("Update rule error:", error);
    return apiError("Failed to update rule", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { supabase, user } = await getAuthenticatedContext();
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    const { id: ruleId } = await params;

    const { data: rule, error: findError } = await supabase
      .from("rules")
      .select("id")
      .eq("id", ruleId)
      .eq("user_id", user.userId)
      .maybeSingle();

    if (findError || !rule) {
      return apiError("Rule not found", 404);
    }

    await supabase.from("rule_executions").delete().eq("rule_id", ruleId);
    await supabase.from("rules").delete().eq("id", ruleId);

    return apiSuccess({ message: "Rule deleted successfully" });
  } catch (error) {
    console.error("Delete rule error:", error);
    return apiError("Failed to delete rule", 500);
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { supabase, user } = await getAuthenticatedContext();
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    const { id: ruleId } = await params;

    const { data: rule, error } = await supabase
      .from("rules")
      .select("id, dataset_id")
      .eq("id", ruleId)
      .eq("user_id", user.userId)
      .maybeSingle();

    if (error || !rule) {
      return apiError("Rule not found", 404);
    }

    await RuleEngine.processRules(
      supabase,
      user.userId,
      { type: "manual", ruleId },
      rule.dataset_id,
    );

    return apiSuccess({ message: "Rule executed successfully" });
  } catch (error) {
    console.error("Execute rule error:", error);
    return apiError("Failed to execute rule", 500);
  }
}
