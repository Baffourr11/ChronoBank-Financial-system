import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError('Unauthorized', 401);
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const category = searchParams.get('category');
    const accountId = searchParams.get('accountId');
    const limit = parseInt(searchParams.get('limit') || '100');
    const skip = parseInt(searchParams.get('skip') || '0');

    const db = await getDatabase();
    const transactionsCollection = db.collection('transactions');

    const query: any = { userId: new ObjectId(user.userId) };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    if (category) {
      query.category = category;
    }

    if (accountId) {
      query.accountId = new ObjectId(accountId);
    }

    const transactions = await transactionsCollection
      .find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await transactionsCollection.countDocuments(query);

    return apiSuccess({
      transactions: transactions.map((t: any) => ({
        id: t._id.toString(),
        userId: t.userId.toString(),
        accountId: t.accountId.toString(),
        type: t.type,
        category: t.category,
        amount: t.amount,
        description: t.description,
        date: t.date,
        status: t.status,
        tags: t.tags || [],
        createdAt: t.createdAt,
      })),
      total,
      hasMore: skip + transactions.length < total,
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    return apiError('Failed to fetch transactions', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError('Unauthorized', 401);
    }

    const body = await request.json();
    const { accountId, type, category, amount, description, date, tags } = body;

    if (!accountId || !type || !category || amount === undefined) {
      return apiError('Missing required fields', 400);
    }

    const db = await getDatabase();
    const transactionsCollection = db.collection('transactions');

    const result = await transactionsCollection.insertOne({
      _id: new ObjectId(),
      userId: new ObjectId(user.userId),
      accountId: new ObjectId(accountId),
      type,
      category,
      amount: parseFloat(amount),
      description: description || '',
      date: new Date(date || new Date()),
      status: 'completed',
      tags: tags || [],
      createdAt: new Date(),
    });

    return apiSuccess(
      {
        id: result.insertedId.toString(),
        accountId,
        type,
        category,
        amount,
        description,
        date,
      },
      201
    );
  } catch (error) {
    console.error('Create transaction error:', error);
    return apiError('Failed to create transaction', 500);
  }
}
