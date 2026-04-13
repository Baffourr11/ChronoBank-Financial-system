// Path: app/api/alerts/[id]/read/route.ts
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api";
import { Alert } from "@/lib/models";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    await connectToDatabase();

    const result = await Alert.updateOne(
      {
        _id: params.id,
        userId: user.userId,
      },
      { isRead: true },
    );

    if (result.matchedCount === 0) {
      return apiError("Alert not found", 404);
    }

    return apiSuccess({ message: "Alert marked as read" });
  } catch (error) {
    console.error("Update alert error:", error);
    return apiError("Failed to update alert", 500);
  }
}
