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

    const db = await getDatabase();
    const budgetsCollection = db.collection('budgets');

    const budgets = await budgetsCollection
      .find({ userId: new ObjectId(user.userId) })
      .sort({ createdAt: -1 })
      .toArray();

    return apiSuccess(
      budgets.map((budget: any) => ({
        id: budget._id.toString(),
        userId: budget.userId.toString(),
        category: budget.category,
        limitAmount: budget.limitAmount,
        period: budget.period,
        alertThreshold: budget.alertThreshold,
        startDate: budget.startDate,
        createdAt: budget.createdAt,
      }))
    );
  } catch (error) {
    console.error('Get budgets error:', error);
    return apiError('Failed to fetch budgets', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError('Unauthorized', 401);
    }

    const body = await request.json();
    const { category, limitAmount, period, alertThreshold } = body;

    if (!category || limitAmount === undefined || !period) {
      return apiError('Missing required fields', 400);
    }

    const db = await getDatabase();
    const budgetsCollection = db.collection('budgets');

    const result = await budgetsCollection.insertOne({
      _id: new ObjectId(),
      userId: new ObjectId(user.userId),
      category,
      limitAmount: parseFloat(limitAmount),
      period,
      alertThreshold: alertThreshold || 80,
      startDate: new Date(),
      createdAt: new Date(),
    });

    return apiSuccess(
      {
        id: result.insertedId.toString(),
        category,
        limitAmount,
        period,
        alertThreshold: alertThreshold || 80,
      },
      201
    );
  } catch (error) {
    console.error('Create budget error:', error);
    return apiError('Failed to create budget', 500);
  }
}
