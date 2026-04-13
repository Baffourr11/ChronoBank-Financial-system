// Path: app/api/auth/login/route.ts
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db";
import { generateToken, setAuthCookie } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api";
import { User } from "@/lib/models";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return apiError("Email and password are required", 400);
    }

    await connectToDatabase();

    const user = await User.findOne({ email });
    if (!user) {
      return apiError("Invalid email or password", 401);
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return apiError("Invalid email or password", 401);
    }

    const userId = user._id.toString();
    const token = generateToken(userId, email);
    await setAuthCookie(token);

    return apiSuccess({
      userId,
      email,
      username: user.username,
      message: "Login successful",
    });
  } catch (error) {
    console.error("Login error:", error);
    return apiError("Login failed", 500);
  }
}
