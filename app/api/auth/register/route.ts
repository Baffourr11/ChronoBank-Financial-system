import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDatabase } from '@/lib/db';
import { generateToken, setAuthCookie } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, username, password, confirmPassword } = body;

    // Validation
    if (!email || !username || !password) {
      return apiError('Missing required fields', 400);
    }

    if (password !== confirmPassword) {
      return apiError('Passwords do not match', 400);
    }

    if (password.length < 6) {
      return apiError('Password must be at least 6 characters', 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return apiError('Invalid email format', 400);
    }

    const db = await getDatabase();
    const usersCollection = db.collection('users');

    // Check if email or username already exists
    const existingUser = await usersCollection.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return apiError('Email or username already exists', 409);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await usersCollection.insertOne({
      _id: new ObjectId(),
      email,
      username,
      passwordHash: hashedPassword,
      createdAt: new Date(),
      preferences: {
        currency: 'USD',
        timezone: 'UTC',
        theme: 'light',
      },
    });

    const userId = result.insertedId.toString();
    
    // Generate JWT and set cookie
    const token = generateToken(userId, email);
    await setAuthCookie(token);

    return apiSuccess(
      {
        userId,
        email,
        username,
        message: 'Registration successful',
      },
      201
    );
  } catch (error) {
    console.error('Registration error:', error);
    return apiError('Registration failed', 500);
  }
}
