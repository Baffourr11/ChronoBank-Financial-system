import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/api/helpers";
import { apiSuccess, apiError } from "@/lib/api";
import {
  getDatasetIdFromRequest,
  resolveDatasetId,
} from "@/lib/dataset/resolveDataset";
import { recalculateBalanceForAccount } from "@/lib/finance/recalculateBalances";
import {
  isLargeExpense,
  runChainReaction,
} from "@/lib/automation/chainReaction";
import { maybeCreateBudgetOverspendAlert } from "@/lib/alerts/budgetOverspend";
import type { TransactionRow } from "@/lib/supabase/types";

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
        datasetId: null,
        transactions: [],
        pagination: { page: 1, limit: 100, total: 0, pages: 0 },
        summary: {
          totalIncome: 0,
          totalExpenses: 0,
          netIncome: 0,
          transactionCount: 0,
        },
      });
    }

    const limit = parseInt(searchParams.get("limit") || "100");
    const page = parseInt(searchParams.get("page") || "1");
    const accountId = searchParams.get("accountId");
    const category = searchParams.get("category");
    const type = searchParams.get("type");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    let query = supabase
      .from("transactions")
      .select("*, accounts!inner(name, type, currency)", { count: "exact" })
      .eq("user_id", user.userId)
      .eq("dataset_id", datasetId);

    if (accountId) query = query.eq("account_id", accountId);
    if (category) query = query.eq("category", category);
    if (type) query = query.eq("type", type);
    if (startDate) query = query.gte("date", startDate);
    if (endDate) query = query.lte("date", endDate);

    const skip = (page - 1) * limit;
    const { data: rows, count, error } = await query
      .order("date", { ascending: false })
      .range(skip, skip + limit - 1);

    if (error) throw error;

    const transactions = rows ?? [];
    const total = count ?? 0;

    let summaryQuery = supabase
      .from("transactions")
      .select("type, amount")
      .eq("user_id", user.userId)
      .eq("dataset_id", datasetId);

    if (accountId) summaryQuery = summaryQuery.eq("account_id", accountId);
    if (category) summaryQuery = summaryQuery.eq("category", category);
    if (type) summaryQuery = summaryQuery.eq("type", type);
    if (startDate) summaryQuery = summaryQuery.gte("date", startDate);
    if (endDate) summaryQuery = summaryQuery.lte("date", endDate);

    const { data: summaryRows } = await summaryQuery;

    const summary = (summaryRows ?? []).reduce(
      (acc, row) => {
        const key = row.type as string;
        if (!acc[key]) acc[key] = { total: 0, count: 0 };
        acc[key].total += Number(row.amount);
        acc[key].count += 1;
        return acc;
      },
      {} as Record<string, { total: number; count: number }>,
    );

    const incomeSummary = summary.income || { total: 0, count: 0 };
    const expenseSummary = summary.expense || { total: 0, count: 0 };

    return apiSuccess({
      datasetId,
      transactions: transactions.map((tx) => {
        const account = (
          tx as { accounts?: { name: string; type: string; currency: string } }
        ).accounts;
        return {
          id: tx.id,
          accountId: tx.account_id,
          account: account
            ? {
                name: account.name,
                type: account.type,
                currency: account.currency,
              }
            : undefined,
          type: tx.type,
          category: tx.category,
          amount: Number(tx.amount),
          description: tx.description,
          date: tx.date,
          scheduledDate: tx.scheduled_date,
          isRecurring: tx.is_recurring,
          recurrencePattern: tx.recurrence_pattern,
          status: tx.status,
          tags: tx.tags,
          createdAt: tx.created_at,
          updatedAt: tx.updated_at,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      summary: {
        totalIncome: incomeSummary.total,
        totalExpenses: expenseSummary.total,
        netIncome: incomeSummary.total - expenseSummary.total,
        transactionCount: total,
      },
    });
  } catch (error) {
    console.error("Get transactions error:", error);
    return apiError("Failed to fetch transactions", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedContext();
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    const body = await request.json();
    const {
      accountId,
      type,
      category,
      amount,
      description,
      date,
      scheduledDate,
      isRecurring,
      recurrencePattern,
      tags,
      datasetId: bodyDatasetId,
    } = body;

    if (!accountId || !type || !category || !amount) {
      return apiError(
        "Missing required fields: accountId, type, category, amount",
        400,
      );
    }

    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("*")
      .eq("id", accountId)
      .eq("user_id", user.userId)
      .maybeSingle();

    if (accountError || !account) {
      return apiError("Account not found or doesn't belong to user", 404);
    }

    const datasetId =
      account.dataset_id ??
      (await resolveDatasetId(supabase, user.userId, bodyDatasetId));

    if (!datasetId) {
      return apiError("Account has no dataset scope", 400);
    }

    const parsedAmount = parseFloat(amount);
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .insert({
        user_id: user.userId,
        dataset_id: datasetId,
        account_id: accountId,
        type,
        category,
        amount: parsedAmount,
        description: description || "",
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        scheduled_date: scheduledDate
          ? new Date(scheduledDate).toISOString()
          : null,
        is_recurring: isRecurring || false,
        recurrence_pattern: recurrencePattern ?? null,
        status: "completed",
        tags: tags || [],
      })
      .select("*")
      .single();

    if (txError || !transaction) throw txError;

    await recalculateBalanceForAccount(supabase, user.userId, accountId, datasetId);

    const row = transaction as TransactionRow;

    void maybeCreateBudgetOverspendAlert(supabase, user.userId, datasetId, {
      id: row.id,
      type: row.type,
      category: row.category,
      amount: Number(row.amount),
      date: row.date,
      description: row.description,
    });

    const { data: accBalances } = await supabase
      .from("accounts")
      .select("balance")
      .eq("user_id", user.userId)
      .eq("dataset_id", datasetId);
    const totalBalance = (accBalances ?? []).reduce(
      (s, a) => s + Number(a.balance),
      0,
    );
    const large = isLargeExpense(parsedAmount, type, totalBalance);

    void runChainReaction(
      supabase,
      user.userId,
      datasetId,
      {
        type: "transaction",
        isLarge: large,
        amount: parsedAmount,
        category,
        transaction: {
          id: row.id,
          type: row.type,
          category: row.category,
          amount: Number(row.amount),
          description: row.description,
          date: row.date,
        },
      },
      { runRules: true, skipIntelligence: !large },
    );

    return apiSuccess(
      {
        id: row.id,
        accountId: row.account_id,
        datasetId,
        type: row.type,
        category: row.category,
        amount: Number(row.amount),
        description: row.description,
        date: row.date,
        isRecurring: row.is_recurring,
        status: row.status,
        tags: row.tags,
        createdAt: row.created_at,
      },
      201,
    );
  } catch (error) {
    console.error("Create transaction error:", error);
    return apiError("Failed to create transaction", 500);
  }
}
