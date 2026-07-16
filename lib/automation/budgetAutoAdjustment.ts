import type { ITransaction } from "@/lib/models/Transaction";
import type { SpendingPattern } from "@/lib/analytics/PatternDetector";
import type { BudgetRow } from "@/lib/automation/types";
import { formatGhs } from "@/lib/automation/format";

export interface BudgetRecommendation {
  recommendation: string;
  priority: "low" | "medium" | "high";
  metadata: Record<string, unknown>;
}

function getWeekStart(d: Date): string {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = copy.getDate() - day + (day === 0 ? -6 : 1);
  copy.setDate(diff);
  copy.setHours(0, 0, 0, 0);
  return copy.toISOString().split("T")[0];
}

/**
 * Compares historical spending vs budgets; recommends limits (no auto-apply).
 */
export function generateBudgetRecommendations(
  transactions: ITransaction[],
  budgets: BudgetRow[],
  patterns: SpendingPattern[],
): BudgetRecommendation[] {
  const recs: BudgetRecommendation[] = [];
  const now = new Date();
  const expenses = transactions.filter((t) => t.type === "expense");

  const budgetByCategory = new Map(
    budgets.map((b) => [b.category.toLowerCase(), b]),
  );

  // Weekly overspend streaks per category
  const weeklyByCategory = new Map<string, Map<string, number>>();
  for (const t of expenses) {
    const cat = (t.category || "Uncategorized").toLowerCase();
    const week = getWeekStart(new Date(t.date));
    if (!weeklyByCategory.has(cat)) weeklyByCategory.set(cat, new Map());
    const weeks = weeklyByCategory.get(cat)!;
    weeks.set(week, (weeks.get(week) ?? 0) + t.amount);
  }

  for (const budget of budgets) {
    const catKey = budget.category.toLowerCase();
    const weeks = weeklyByCategory.get(catKey);
    if (!weeks) continue;

    const sortedWeeks = [...weeks.entries()].sort((a, b) =>
      b[0].localeCompare(a[0]),
    );
    const recent = sortedWeeks.slice(0, 4);
    const weeklyLimit = budget.limit_amount / 4.33;
    let overWeeks = 0;
    for (const [, spent] of recent) {
      if (spent > weeklyLimit) overWeeks++;
    }

    if (overWeeks >= 3) {
      const avgWeekly =
        recent.reduce((s, [, v]) => s + v, 0) / Math.max(recent.length, 1);
      const suggestedMonthly = Math.ceil(avgWeekly * 4.33 * 1.05);
      recs.push({
        recommendation: `Your ${budget.category} expenses exceeded budget for ${overWeeks} consecutive weeks. Suggested monthly limit: ${formatGhs(suggestedMonthly)}.`,
        priority: "high",
        metadata: {
          source: "budget_automation",
          category: budget.category,
          currentLimit: budget.limit_amount,
          suggestedLimit: suggestedMonthly,
          overWeeks,
        },
      });
    } else if (budget.limit_amount > 0) {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthSpend = expenses
        .filter(
          (t) =>
            t.category?.toLowerCase() === catKey &&
            new Date(t.date) >= monthStart,
        )
        .reduce((s, t) => s + t.amount, 0);
      if (monthSpend > budget.limit_amount * 1.15) {
        recs.push({
          recommendation: `${budget.category} is trending ${Math.round(((monthSpend / budget.limit_amount) - 1) * 100)}% over this month's budget. Consider raising the limit or cutting discretionary spend.`,
          priority: "medium",
          metadata: {
            source: "budget_automation",
            category: budget.category,
            monthSpend,
            limit: budget.limit_amount,
          },
        });
      }
    }
  }

  // Categories with spend but no budget
  const patternByCat = new Map(
    patterns.map((p) => [p.category.toLowerCase(), p]),
  );
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthByCat = new Map<string, number>();
  for (const t of expenses) {
    if (new Date(t.date) < monthStart) continue;
    const cat = (t.category || "Uncategorized").toLowerCase();
    monthByCat.set(cat, (monthByCat.get(cat) ?? 0) + t.amount);
  }

  for (const [cat, spent] of monthByCat) {
    if (budgetByCategory.has(cat)) continue;
    const pattern = patternByCat.get(cat);
    if (spent < 100) continue;
    const suggested = pattern
      ? Math.ceil(pattern.averageAmount * pattern.frequency)
      : Math.ceil(spent * 1.1);
    if (suggested > spent * 2) continue;
    recs.push({
      recommendation: `No budget set for "${cat.replace(/\b\w/g, (c) => c.toUpperCase())}" but you've spent ${formatGhs(spent)} this month. Suggested monthly limit: ${formatGhs(suggested)}.`,
      priority: "low",
      metadata: {
        source: "budget_automation",
        category: cat,
        suggestedLimit: suggested,
        flag: "missing_budget",
      },
    });
  }

  // Unrealistic budgets (limit far below actual pattern)
  for (const budget of budgets) {
    const pattern = patternByCat.get(budget.category.toLowerCase());
    if (!pattern || pattern.confidence < 0.5) continue;
    const typicalMonthly = pattern.averageAmount * pattern.frequency;
    if (budget.limit_amount < typicalMonthly * 0.5 && typicalMonthly > 0) {
      recs.push({
        recommendation: `Budget for ${budget.category} (${formatGhs(budget.limit_amount)}) looks unrealistic vs typical spend (~${formatGhs(typicalMonthly)}/month). Consider ${formatGhs(Math.ceil(typicalMonthly * 1.05))}.`,
        priority: "medium",
        metadata: {
          source: "budget_automation",
          category: budget.category,
          flag: "unrealistic_budget",
          typicalMonthly,
        },
      });
    }
  }

  return recs.slice(0, 8);
}
