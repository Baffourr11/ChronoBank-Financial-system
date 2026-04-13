import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api";
import { Rule, RuleExecution } from "@/lib/models";
import { RuleEngine } from "@/lib/rules/RuleEngine";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const includeExecutions = searchParams.get('includeExecutions') === 'true';

    const rules = await Rule.find({ userId: user.userId }).sort({ createdAt: -1 });

    let result = rules.map((rule) => ({
      id: rule._id.toString(),
      name: rule.name,
      description: rule.description,
      isActive: rule.isActive,
      priority: rule.priority,
      conditions: rule.conditions,
      actions: rule.actions,
      schedule: rule.schedule,
      executionCount: rule.executionCount,
      lastExecuted: rule.lastExecuted,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    }));

    if (includeExecutions) {
      const executions = await RuleExecution.find({ userId: user.userId })
        .sort({ createdAt: -1 })
        .limit(100);

      const executionsByRule = executions.reduce((acc, execution) => {
        const ruleId = execution.ruleId.toString();
        if (!acc[ruleId]) acc[ruleId] = [];
        acc[ruleId].push({
          id: execution._id.toString(),
          triggeredBy: execution.triggeredBy,
          conditionsMet: execution.conditionsMet,
          actionsExecuted: execution.actionsExecuted,
          status: execution.status,
          error: execution.error,
          executionTime: execution.executionTime,
          createdAt: execution.createdAt,
        });
        return acc;
      }, {} as Record<string, any[]>);

      result = result.map(rule => ({
        ...rule,
        executions: executionsByRule[rule.id] || []
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
    const user = await getCurrentUser();
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    const body = await request.json();
    const { name, description, conditions, actions, schedule, priority = 5 } = body;

    if (!name || !conditions || !actions || !schedule) {
      return apiError("Missing required fields", 400);
    }

    await connectToDatabase();

    const newRule = await Rule.create({
      userId: user.userId,
      name,
      description,
      conditions,
      actions,
      schedule,
      priority,
      isActive: true,
      executionCount: 0,
    });

    return apiSuccess({
      id: newRule._id.toString(),
      name,
      description,
      conditions,
      actions,
      schedule,
      priority,
      isActive: true,
      executionCount: 0,
      createdAt: newRule.createdAt,
    }, 201);
  } catch (error) {
    console.error("Create rule error:", error);
    return apiError("Failed to create rule", 500);
  }
}
