/** Monthly spend per category — same logic as Budgets page and rule engine */
export function getMonthStart(reference = new Date()): Date {
  return new Date(reference.getFullYear(), reference.getMonth(), 1);
}

export function computeMonthlySpendByCategory(
  transactions: Array<{
    type: string;
    category?: string | null;
    amount: number | string;
    date: string | Date;
    status?: string | null;
  }>,
  reference = new Date(),
): Record<string, number> {
  const monthStart = getMonthStart(reference);
  const spent: Record<string, number> = {};

  for (const tx of transactions) {
    if (tx.type !== "expense") continue;
    const d = new Date(tx.date);
    if (d < monthStart) continue;
    const cat = normalizeCategoryName(tx.category);
    spent[cat] = (spent[cat] ?? 0) + Number(tx.amount);
  }

  return spent;
}

/** Matches Budgets page display (rounded whole percent) */
export function budgetPercentUsed(
  spent: number,
  limit: number,
): number {
  if (limit <= 0) return 0;
  return Math.round((spent / limit) * 100);
}

export function normalizeCategoryName(category: string | null | undefined): string {
  return (category || "Uncategorized").trim();
}

export function spentForBudgetCategory(
  spentByCategory: Record<string, number>,
  budgetCategory: string,
): number {
  const target = normalizeCategoryName(budgetCategory).toLowerCase();
  for (const [cat, amount] of Object.entries(spentByCategory)) {
    if (normalizeCategoryName(cat).toLowerCase() === target) {
      return amount;
    }
  }
  return 0;
}
