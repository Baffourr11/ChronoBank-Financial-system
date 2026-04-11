import { NextRequest } from 'next/server';
import { clearAuthCookie } from '@/lib/auth';
import { apiMessage } from '@/lib/api';

export async function POST(request: NextRequest) {
  try {
    await clearAuthCookie();
    return apiMessage('Logout successful');
  } catch (error) {
    console.error('Logout error:', error);
    return apiMessage('Logout completed', 200);
  }
}
