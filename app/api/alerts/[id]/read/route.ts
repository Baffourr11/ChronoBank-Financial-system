import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api';
import { ObjectId } from 'mongodb';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError('Unauthorized', 401);
    }

    const db = await getDatabase();
    const alertsCollection = db.collection('alerts');

    const result = await alertsCollection.updateOne(
      {
        _id: new ObjectId(params.id),
        userId: new ObjectId(user.userId),
      },
      { $set: { isRead: true } }
    );

    if (result.matchedCount === 0) {
      return apiError('Alert not found', 404);
    }

    return apiSuccess({ message: 'Alert marked as read' });
  } catch (error) {
    console.error('Update alert error:', error);
    return apiError('Failed to update alert', 500);
  }
}
