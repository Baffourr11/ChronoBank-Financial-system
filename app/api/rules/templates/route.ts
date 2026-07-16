import { apiSuccess, apiError } from "@/lib/api";
import { THESIS_RULE_TEMPLATES } from "@/lib/rules/templates";

export async function GET() {
  try {
    return apiSuccess({
      templates: THESIS_RULE_TEMPLATES.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        rule: t.rule,
      })),
    });
  } catch (error) {
    console.error("Get rule templates error:", error);
    return apiError("Failed to fetch rule templates", 500);
  }
}
