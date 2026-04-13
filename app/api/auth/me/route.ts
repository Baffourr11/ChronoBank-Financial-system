// Path: app/api/auth/me/route.ts
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api";
import { User } from "@/lib/models";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    await connectToDatabase();

    const userData = await User.findById(user.userId);

    if (!userData) {
      return apiError("User not found", 404);
    }

    return apiSuccess({
      userId: userData._id.toString(),
      email: userData.email,
      username: userData.username,
      preferences: userData.preferences,
    });
  } catch (error) {
    console.error("Get user error:", error);
    return apiError("Failed to fetch user", 500);
  }
}
