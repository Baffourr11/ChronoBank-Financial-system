import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/api/helpers";
import { apiSuccess, apiError } from "@/lib/api";
import {
  getDatasetIdFromRequest,
  resolveDatasetId,
} from "@/lib/dataset/resolveDataset";
import type { AccountRow } from "@/lib/supabase/types";

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedContext();
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const datasetId = await resolveDatasetId(supabase, user.userId,
      getDatasetIdFromRequest(searchParams),
    );

    if (!datasetId) {
      return apiSuccess({
        accounts: [],
        summary: { totalAccounts: 0, totalBalance: 0, accountTypes: {} },
        datasetId: null,
        message: "No dataset selected. Upload or activate a dataset first.",
      });
    }

    const { data: accounts, error } = await supabase
      .from("accounts")
      .select("*")
      .eq("user_id", user.userId)
      .eq("dataset_id", datasetId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const rows = (accounts ?? []) as AccountRow[];
    const accountsWithStats = await Promise.all(
      rows.map(async (account) => {
        const { count } = await supabase
          .from("transactions")
          .select("*", { count: "exact", head: true })
          .eq("account_id", account.id)
          .eq("dataset_id", datasetId);

        const { data: latestTx } = await supabase
          .from("transactions")
          .select("date")
          .eq("account_id", account.id)
          .eq("dataset_id", datasetId)
          .order("date", { ascending: false })
          .limit(1)
          .maybeSingle();

        return {
          id: account.id,
          name: account.name,
          type: account.type,
          balance: Number(account.balance),
          currency: account.currency,
          transactionCount: count ?? 0,
          lastActivity: latestTx?.date ?? account.created_at,
          createdAt: account.created_at,
          updatedAt: account.updated_at,
        };
      }),
    );

    const totalBalance = rows.reduce(
      (sum, account) => sum + Number(account.balance),
      0,
    );

    return apiSuccess({
      datasetId,
      accounts: accountsWithStats,
      summary: {
        totalAccounts: rows.length,
        totalBalance,
        accountTypes: rows.reduce(
          (acc, account) => {
            acc[account.type] = (acc[account.type] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),
      },
    });
  } catch (error) {
    console.error("Get accounts error:", error);
    return apiError("Failed to fetch accounts", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedContext();
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    const body = await request.json();
    const { name, type, balance = 0, currency = "USD", datasetId: bodyDatasetId } =
      body;

    if (!name || !type) {
      return apiError("Missing required fields: name, type", 400);
    }

    if (!["checking", "savings", "investment", "credit"].includes(type)) {
      return apiError(
        "Invalid account type. Must be: checking, savings, investment, or credit",
        400,
      );
    }

    const datasetId = await resolveDatasetId(supabase, user.userId, bodyDatasetId);
    if (!datasetId) {
      return apiError("No active dataset. Create or select a dataset first.", 400);
    }

    const { data: account, error } = await supabase
      .from("accounts")
      .insert({
        user_id: user.userId,
        dataset_id: datasetId,
        name,
        type,
        balance: parseFloat(balance),
        currency,
      })
      .select("*")
      .single();

    if (error || !account) throw error;

    return apiSuccess(
      {
        id: account.id,
        name: account.name,
        type: account.type,
        balance: Number(account.balance),
        currency: account.currency,
        datasetId,
        createdAt: account.created_at,
      },
      201,
    );
  } catch (error) {
    console.error("Create account error:", error);
    return apiError("Failed to create account", 500);
  }
}
