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
    const usersCollection = db.collection('users');

    const userData = await usersCollection.findOne({
      _id: new ObjectId(user.userId),
    });

    if (!userData) {
      return apiError('User not found', 404);
    }

    return apiSuccess({
      userId: userData._id.toString(),
      email: userData.email,
      username: userData.username,
      preferences: userData.preferences,
    });
  } catch (error) {
    console.error('Get user error:', error);
    return apiError('Failed to fetch user', 500);
  }
}
