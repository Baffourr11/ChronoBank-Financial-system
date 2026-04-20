// Path: app/api/analytics/scenarios/route.ts
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api";
import { Transaction, Account } from "@/lib/models";
import { ScenarioEngine } from "@/lib/simulator/ScenarioEngine";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    await connectToDatabase();

    let scenarios = [];

    if (type === "market_shock") {
      scenarios = ScenarioEngine.createMarketShockScenarios();
    } else if (type === "income_change") {
      scenarios = ScenarioEngine.createIncomeShockScenarios();
    } else if (type === "expense_change") {
      scenarios = ScenarioEngine.createExpenseShockScenarios();
    } else {
      // Return all scenario templates
      scenarios = [
        ...ScenarioEngine.createMarketShockScenarios(),
        ...ScenarioEngine.createIncomeShockScenarios(),
        ...ScenarioEngine.createExpenseShockScenarios(),
      ];
    }

    return apiSuccess(scenarios);
  } catch (error) {
    console.error("Get scenarios error:", error);
    return apiError("Failed to fetch scenarios", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    const body = await request.json();
    const { scenario, projectionDays = 90, datasetId } = body;

    if (!scenario) {
      return apiError("Scenario is required", 400);
    }

    await connectToDatabase();

    // Build query filter - include datasetId if provided
    const transactionQuery: any = { userId: user.userId };
    const accountQuery: any = { userId: user.userId };

    if (datasetId) {
      transactionQuery.datasetId = datasetId;
      accountQuery.datasetId = datasetId;
    }

    // Get user's financial data (filtered by dataset if specified)
    const [transactions, accounts] = await Promise.all([
      Transaction.find(transactionQuery).sort({ date: -1 }).limit(2000),
      Account.find(accountQuery),
    ]);

    // Run the scenario simulation
    const result = await ScenarioEngine.runScenario(
      scenario,
      accounts,
      transactions,
      projectionDays,
    );

    return apiSuccess(result);
  } catch (error) {
    console.error("Run scenario error:", error);
    return apiError("Failed to run scenario", 500);
  }
}
