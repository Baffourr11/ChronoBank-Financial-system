import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api";
import { RuleEngine } from "@/lib/rules/RuleEngine";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const secret = process.env.CRON_SECRET;

    if (!secret) {
      return apiError("CRON_SECRET not configured", 500);
    }

    if (authHeader !== `Bearer ${secret}`) {
      return apiError("Unauthorized", 401);
    }

    await RuleEngine.processScheduledRules();

    return apiSuccess({
      message: "Scheduled rules processed",
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron rules error:", error);
    return apiError("Failed to process scheduled rules", 500);
  }
}
