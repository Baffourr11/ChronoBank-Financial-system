import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api";
import { Rule, RuleExecution } from "@/lib/models";
import { RuleEngine } from "@/lib/rules/RuleEngine";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    await connectToDatabase();

    const rule = await Rule.findOne({ 
      _id: params.id, 
      userId: user.userId 
    });

    if (!rule) {
      return apiError("Rule not found", 404);
    }

    const executions = await RuleExecution.find({ 
      ruleId: params.id,
      userId: user.userId 
    }).sort({ createdAt: -1 }).limit(50);

    return apiSuccess({
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
      executions: executions.map(exec => ({
        id: exec._id.toString(),
        triggeredBy: exec.triggeredBy,
        conditionsMet: exec.conditionsMet,
        actionsExecuted: exec.actionsExecuted,
        status: exec.status,
        error: exec.error,
        executionTime: exec.executionTime,
        createdAt: exec.createdAt,
      })),
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    });
  } catch (error) {
    console.error("Get rule error:", error);
    return apiError("Failed to fetch rule", 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    const body = await request.json();
    const { name, description, conditions, actions, schedule, priority, isActive } = body;

    await connectToDatabase();

    const rule = await Rule.findOne({ 
      _id: params.id, 
      userId: user.userId 
    });

    if (!rule) {
      return apiError("Rule not found", 404);
    }

    // Update rule fields
    if (name !== undefined) rule.name = name;
    if (description !== undefined) rule.description = description;
    if (conditions !== undefined) rule.conditions = conditions;
    if (actions !== undefined) rule.actions = actions;
    if (schedule !== undefined) rule.schedule = schedule;
    if (priority !== undefined) rule.priority = priority;
    if (isActive !== undefined) rule.isActive = isActive;

    await rule.save();

    return apiSuccess({
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
      updatedAt: rule.updatedAt,
    });
  } catch (error) {
    console.error("Update rule error:", error);
    return apiError("Failed to update rule", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    await connectToDatabase();

    const rule = await Rule.findOne({ 
      _id: params.id, 
      userId: user.userId 
    });

    if (!rule) {
      return apiError("Rule not found", 404);
    }

    // Delete rule and its executions
    await RuleExecution.deleteMany({ ruleId: params.id });
    await Rule.findByIdAndDelete(params.id);

    return apiSuccess({ message: "Rule deleted successfully" });
  } catch (error) {
    console.error("Delete rule error:", error);
    return apiError("Failed to delete rule", 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    await connectToDatabase();

    const rule = await Rule.findOne({ 
      _id: params.id, 
      userId: user.userId 
    });

    if (!rule) {
      return apiError("Rule not found", 404);
    }

    // Manually trigger rule execution
    await RuleEngine.processRules(user.userId, { 
      type: 'manual', 
      ruleId: params.id 
    });

    return apiSuccess({ message: "Rule executed successfully" });
  } catch (error) {
    console.error("Execute rule error:", error);
    return apiError("Failed to execute rule", 500);
  }
}
