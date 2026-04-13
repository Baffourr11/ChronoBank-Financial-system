// Path: app/api/accounts/route.ts
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api";
import { Account } from "@/lib/models";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    await connectToDatabase();

    const accounts = await Account.find({ userId: user.userId }).sort({
      createdAt: -1,
    });

    return apiSuccess(
      accounts.map((acc) => ({
        id: acc._id.toString(),
        userId: acc.userId.toString(),
        name: acc.name,
        type: acc.type,
        balance: acc.balance,
        currency: acc.currency,
        createdAt: acc.createdAt,
      })),
    );
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
    const { name, type, balance, currency } = body;

    if (!name || !type || balance === undefined) {
      return apiError("Missing required fields", 400);
    }

    await connectToDatabase();

    const newAccount = await Account.create({
      userId: user.userId,
      name,
      type,
      balance: parseFloat(balance),
      currency: currency || "USD",
    });

    return apiSuccess(
      {
        id: newAccount._id.toString(),
        name,
        type,
        balance,
        currency: currency || "USD",
      },
      201,
    );
  } catch (error) {
    console.error("Create account error:", error);
    return apiError("Failed to create account", 500);
  }
}
