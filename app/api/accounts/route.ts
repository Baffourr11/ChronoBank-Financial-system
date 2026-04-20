import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api";
import { Account, Transaction } from "@/lib/models";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    await connectToDatabase();

    const accounts = await Account.find({ userId: user.userId })
      .sort({ createdAt: -1 });

    // Get transaction counts and latest transaction dates for each account
    const accountsWithStats = await Promise.all(
      accounts.map(async (account) => {
        const transactionCount = await Transaction.countDocuments({ 
          accountId: account._id 
        });
        
        const latestTransaction = await Transaction.findOne({ 
          accountId: account._id 
        }).sort({ date: -1 });

        return {
          id: account._id.toString(),
          name: account.name,
          type: account.type,
          balance: account.balance,
          currency: account.currency,
          transactionCount,
          lastActivity: latestTransaction?.date || account.createdAt,
          createdAt: account.createdAt,
          updatedAt: account.updatedAt,
        };
      })
    );

    // Calculate total balance across all accounts
    const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);

    return apiSuccess({
      accounts: accountsWithStats,
      summary: {
        totalAccounts: accounts.length,
        totalBalance,
        accountTypes: accounts.reduce((acc, account) => {
          acc[account.type] = (acc[account.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      }
    });
  } catch (error) {
    console.error("Get accounts error:", error);
    return apiError("Failed to fetch accounts", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    const body = await request.json();
    const { name, type, balance = 0, currency = "USD" } = body;

    if (!name || !type) {
      return apiError("Missing required fields: name, type", 400);
    }

    if (!["checking", "savings", "investment", "credit"].includes(type)) {
      return apiError("Invalid account type. Must be: checking, savings, investment, or credit", 400);
    }

    await connectToDatabase();

    const account = await Account.create({
      userId: user.userId,
      name,
      type,
      balance: parseFloat(balance),
      currency,
    });

    return apiSuccess({
      id: account._id.toString(),
      name: account.name,
      type: account.type,
      balance: account.balance,
      currency: account.currency,
      createdAt: account.createdAt,
    }, 201);
  } catch (error) {
    console.error("Create account error:", error);
    return apiError("Failed to create account", 500);
  }
}
