import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api";
import { Transaction, Account } from "@/lib/models";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const page = parseInt(searchParams.get('page') || '1');
    const accountId = searchParams.get('accountId');
    const category = searchParams.get('category');
    const type = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build query
    const query: any = { userId: user.userId };
    
    if (accountId) {
      query.accountId = accountId;
    }
    
    if (category) {
      query.category = category;
    }
    
    if (type) {
      query.type = type;
    }
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        query.date.$lte = new Date(endDate);
      }
    }

    // Get transactions with pagination
    const skip = (page - 1) * limit;
    const transactions = await Transaction.find(query)
      .populate('accountId', 'name type currency')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await Transaction.countDocuments(query);

    // Calculate summary statistics
    const summary = await Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const incomeSummary = summary.find(s => s._id === 'income') || { total: 0, count: 0 };
    const expenseSummary = summary.find(s => s._id === 'expense') || { total: 0, count: 0 };

    return apiSuccess({
      transactions: transactions.map(tx => ({
        id: tx._id.toString(),
        accountId: tx.accountId._id.toString(),
        account: tx.accountId,
        type: tx.type,
        category: tx.category,
        amount: tx.amount,
        description: tx.description,
        date: tx.date,
        scheduledDate: tx.scheduledDate,
        isRecurring: tx.isRecurring,
        recurrencePattern: tx.recurrencePattern,
        status: tx.status,
        tags: tx.tags,
        createdAt: tx.createdAt,
        updatedAt: tx.updatedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      summary: {
        totalIncome: incomeSummary.total,
        totalExpenses: expenseSummary.total,
        netIncome: incomeSummary.total - expenseSummary.total,
        transactionCount: total
      }
    });
  } catch (error) {
    console.error("Get transactions error:", error);
    return apiError("Failed to fetch transactions", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
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
      tags 
    } = body;

    if (!accountId || !type || !category || !amount) {
      return apiError("Missing required fields: accountId, type, category, amount", 400);
    }

    await connectToDatabase();

    // Verify account belongs to user
    const account = await Account.findOne({ _id: accountId, userId: user.userId });
    if (!account) {
      return apiError("Account not found or doesn't belong to user", 404);
    }

    // Create transaction
    const transaction = await Transaction.create({
      userId: user.userId,
      accountId,
      type,
      category,
      amount: parseFloat(amount),
      description: description || '',
      date: date ? new Date(date) : new Date(),
      scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
      isRecurring: isRecurring || false,
      recurrencePattern,
      status: 'completed',
      tags: tags || [],
    });

    // Update account balance
    if (type === 'income') {
      account.balance += parseFloat(amount);
    } else if (type === 'expense') {
      account.balance -= parseFloat(amount);
    }
    await account.save();

    return apiSuccess({
      id: transaction._id.toString(),
      accountId: transaction.accountId.toString(),
      type: transaction.type,
      category: transaction.category,
      amount: transaction.amount,
      description: transaction.description,
      date: transaction.date,
      isRecurring: transaction.isRecurring,
      status: transaction.status,
      tags: transaction.tags,
      createdAt: transaction.createdAt,
    }, 201);
  } catch (error) {
    console.error("Create transaction error:", error);
    return apiError("Failed to create transaction", 500);
  }
}
