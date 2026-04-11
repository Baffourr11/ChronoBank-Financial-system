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
    const accountsCollection = db.collection('accounts');

    const accounts = await accountsCollection
      .find({ userId: new ObjectId(user.userId) })
      .sort({ createdAt: -1 })
      .toArray();

    return apiSuccess(
      accounts.map((acc: any) => ({
        id: acc._id.toString(),
        userId: acc.userId.toString(),
        name: acc.name,
        type: acc.type,
        balance: acc.balance,
        currency: acc.currency,
        createdAt: acc.createdAt,
      }))
    );
  } catch (error) {
    console.error('Get accounts error:', error);
    return apiError('Failed to fetch accounts', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError('Unauthorized', 401);
    }

    const body = await request.json();
    const { name, type, balance, currency } = body;

    if (!name || !type || balance === undefined) {
      return apiError('Missing required fields', 400);
    }

    const db = await getDatabase();
    const accountsCollection = db.collection('accounts');

    const result = await accountsCollection.insertOne({
      _id: new ObjectId(),
      userId: new ObjectId(user.userId),
      name,
      type,
      balance: parseFloat(balance),
      currency: currency || 'USD',
      createdAt: new Date(),
    });

    return apiSuccess(
      {
        id: result.insertedId.toString(),
        name,
        type,
        balance,
        currency: currency || 'USD',
      },
      201
    );
  } catch (error) {
    console.error('Create account error:', error);
    return apiError('Failed to create account', 500);
  }
}
