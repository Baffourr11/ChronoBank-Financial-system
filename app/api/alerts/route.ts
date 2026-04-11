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
    const limit = parseInt(searchParams.get('limit') || '100');
    const skip = parseInt(searchParams.get('skip') || '0');

    const db = await getDatabase();
    const alertsCollection = db.collection('alerts');

    const alerts = await alertsCollection
      .find({ userId: new ObjectId(user.userId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await alertsCollection.countDocuments({ userId: new ObjectId(user.userId) });

    return apiSuccess({
      alerts: alerts.map((alert: any) => ({
        id: alert._id.toString(),
        userId: alert.userId.toString(),
        type: alert.type,
        title: alert.title,
        message: alert.message,
        severity: alert.severity,
        isRead: alert.isRead,
        data: alert.data,
        createdAt: alert.createdAt,
      })),
      total,
      hasMore: skip + alerts.length < total,
    });
  } catch (error) {
    console.error('Get alerts error:', error);
    return apiError('Failed to fetch alerts', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError('Unauthorized', 401);
    }

    const body = await request.json();
    const { type, title, message, severity, data } = body;

    if (!type || !title || !message) {
      return apiError('Missing required fields', 400);
    }

    const db = await getDatabase();
    const alertsCollection = db.collection('alerts');

    const result = await alertsCollection.insertOne({
      _id: new ObjectId(),
      userId: new ObjectId(user.userId),
      type,
      title,
      message,
      severity: severity || 'medium',
      isRead: false,
      data: data || {},
      createdAt: new Date(),
    });

    return apiSuccess(
      {
        id: result.insertedId.toString(),
        type,
        title,
        message,
        severity,
      },
      201
    );
  } catch (error) {
    console.error('Create alert error:', error);
    return apiError('Failed to create alert', 500);
  }
}
