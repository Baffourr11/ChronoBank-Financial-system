// Path: app/api/auth/register/route.ts
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db";
import { generateToken, setAuthCookie } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api";
import { User } from "@/lib/models";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, fullName, password, confirmPassword } = body;

    // Validation
    if (!email || !fullName || !password) {
      return apiError("Missing required fields", 400);
    }

    if (password !== confirmPassword) {
      return apiError("Passwords do not match", 400);
    }

    if (password.length < 6) {
      return apiError("Password must be at least 6 characters", 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return apiError("Invalid email format", 400);
    }

    await connectToDatabase();

    // Check if email already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return apiError("Email already exists", 409);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await User.create({
      email,
      fullName,
      passwordHash: hashedPassword,
      preferences: {
        currency: "USD",
        timezone: "UTC",
        theme: "light",
      },
    });

    const userId = newUser._id.toString();

    // Generate JWT and set cookie
    const token = generateToken(userId, email);
    await setAuthCookie(token);

    return apiSuccess(
      {
        userId,
        email,
        fullName,
        message: "Registration successful",
      },
      201,
    );
  } catch (error) {
    console.error("Registration error:", error);
    return apiError("Registration failed", 500);
  }
}
