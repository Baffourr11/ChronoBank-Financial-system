/** Distinct palette for dashboard category charts */
export const VIBRANT_CATEGORY_COLORS = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#f97316", // orange
  "#ec4899", // pink
  "#14b8a6", // teal
  "#6366f1", // indigo
] as const;

export function getCategoryColor(index: number): string {
  return VIBRANT_CATEGORY_COLORS[index % VIBRANT_CATEGORY_COLORS.length];
}

export const VIBRANT_INCOME_COLOR = "#22c55e";
export const VIBRANT_EXPENSE_COLOR = "#f43f5e";
