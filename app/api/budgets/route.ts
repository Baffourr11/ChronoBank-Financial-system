// Path: app/api/budgets/route.ts
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api";
import { Budget } from "@/lib/models";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    await connectToDatabase();

    const budgets = await Budget.find({ userId: user.userId }).sort({
      createdAt: -1,
    });

    return apiSuccess(
      budgets.map((budget) => ({
        id: budget._id.toString(),
        userId: budget.userId.toString(),
        category: budget.category,
        limitAmount: budget.limitAmount,
        period: budget.period,
        alertThreshold: budget.alertThreshold,
        startDate: budget.startDate,
        createdAt: budget.createdAt,
      })),
    );
  } catch (error) {
    console.error("Get budgets error:", error);
    return apiError("Failed to fetch budgets", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    const body = await request.json();
    const { category, limitAmount, period, alertThreshold } = body;

    if (!category || limitAmount === undefined || !period) {
      return apiError("Missing required fields", 400);
    }

    await connectToDatabase();

    const newBudget = await Budget.create({
      userId: user.userId,
      category,
      limitAmount: parseFloat(limitAmount),
      period,
      alertThreshold: alertThreshold || 80,
      startDate: new Date(),
    });

    return apiSuccess(
      {
        id: newBudget._id.toString(),
        category,
        limitAmount,
        period,
        alertThreshold: alertThreshold || 80,
      },
      201,
    );
  } catch (error) {
    console.error("Create budget error:", error);
    return apiError("Failed to create budget", 500);
  }
}
