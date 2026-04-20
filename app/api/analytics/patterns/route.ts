// Path: app/api/analytics/patterns/route.ts
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api";
import { Transaction } from "@/lib/models";
import { PatternDetector } from "@/lib/analytics/PatternDetector";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const lookbackDays = parseInt(searchParams.get("lookbackDays") || "365");
    const datasetId = searchParams.get("datasetId");

    // Build query - filter by dataset if provided
    const query: any = { userId: user.userId };
    if (datasetId) {
      query.datasetId = datasetId;
    }

    // Get user's transactions
    const transactions = await Transaction.find(query)
      .sort({ date: -1 })
      .limit(2000);

    // Detect spending patterns
    const patterns = PatternDetector.detectSpendingPatterns(
      transactions,
      lookbackDays,
    );

    // Detect anomalies
    const anomalies = PatternDetector.detectAnomalies(transactions, patterns);

    // Detect Ghanaian-specific patterns
    const ghanaianPatterns =
      PatternDetector.detectGhanaianPatterns(transactions);

    return apiSuccess({
      patterns,
      anomalies,
      ghanaianPatterns,
      analysisPeriod: {
        lookbackDays,
        totalTransactions: transactions.length,
        expenseTransactions: transactions.filter((t) => t.type === "expense")
          .length,
        incomeTransactions: transactions.filter((t) => t.type === "income")
          .length,
      },
    });
  } catch (error) {
    console.error("Pattern analysis error:", error);
    return apiError("Failed to analyze patterns", 500);
  }
}
