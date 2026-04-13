import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api";
import { Transaction, Account } from "@/lib/models";
import { PatternDetector } from "@/lib/analytics/PatternDetector";
import { Forecaster } from "@/lib/analytics/Forecaster";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const forecastDays = parseInt(searchParams.get('days') || '90');
    const currentBalance = parseFloat(searchParams.get('balance') || '0');

    // Get user's transactions and accounts
    const [transactions, accounts] = await Promise.all([
      Transaction.find({ userId: user.userId }).sort({ date: -1 }).limit(2000),
      Account.find({ userId: user.userId })
    ]);

    // Detect patterns first
    const patterns = PatternDetector.detectSpendingPatterns(transactions);

    // Generate forecasts
    const spendingForecasts = Forecaster.generateSpendingForecast(transactions, patterns, forecastDays);
    
    // Generate cash flow forecast
    const totalBalance = currentBalance > 0 ? currentBalance : accounts.reduce((sum, acc) => sum + acc.balance, 0);
    const cashFlowForecast = Forecaster.generateCashFlowForecast(transactions, totalBalance, forecastDays);
    
    // Generate seasonal forecast
    const seasonalForecast = Forecaster.generateSeasonalForecast(transactions, patterns);
    
    // Detect cash flow issues
    const cashFlowIssues = Forecaster.detectCashFlowIssues(cashFlowForecast);

    return apiSuccess({
      spendingForecasts,
      cashFlowForecast,
      seasonalForecast,
      cashFlowIssues,
      metadata: {
        forecastDays,
        currentBalance: totalBalance,
        patternsCount: patterns.length,
        dataPoints: transactions.length,
        generatedAt: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error("Forecast error:", error);
    return apiError("Failed to generate forecast", 500);
  }
}
