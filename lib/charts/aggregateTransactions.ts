import { getCategoryColor } from "@/lib/charts/categoryColors";

export interface CategorySlice {
  name: string;
  value: number;
  fill?: string;
}

export interface MonthlyBar {
  month: string;
  income: number;
  expenses: number;
}

interface TxLike {
  type: string;
  category: string;
  amount: number;
  date: string;
}

export type ChartColorMode = "theme" | "vibrant";

export function aggregateByCategory(
  transactions: TxLike[],
  type: "income" | "expense",
  limit = 8,
  colorMode: ChartColorMode = "theme",
): CategorySlice[] {
  const totals = new Map<string, number>();

  for (const tx of transactions) {
    if (tx.type !== type) continue;
    const cat = tx.category?.trim() || "Uncategorized";
    totals.set(cat, (totals.get(cat) ?? 0) + Math.abs(Number(tx.amount) || 0));
  }

  const sorted = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  const otherTotal = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(limit)
    .reduce((s, [, v]) => s + v, 0);

  const slices: CategorySlice[] = sorted.map(([name, value], i) => ({
    name,
    value: Math.round(value * 100) / 100,
    fill:
      colorMode === "vibrant"
        ? getCategoryColor(i)
        : `hsl(var(--chart-${(i % 5) + 1}))`,
  }));

  if (otherTotal > 0) {
    slices.push({
      name: "Other",
      value: Math.round(otherTotal * 100) / 100,
      fill:
        colorMode === "vibrant"
          ? getCategoryColor(sorted.length)
          : "hsl(var(--chart-5))",
    });
  }

  return slices;
}

export function aggregateMonthly(
  transactions: TxLike[],
  months = 6,
): MonthlyBar[] {
  const now = new Date();
  const buckets: MonthlyBar[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = start.toLocaleDateString("en-GH", {
      month: "short",
      year: "2-digit",
    });
    buckets.push({ month: label, income: 0, expenses: 0 });
  }

  for (const tx of transactions) {
    const d = new Date(tx.date);
    if (Number.isNaN(d.getTime())) continue;

    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const label = monthStart.toLocaleDateString("en-GH", {
      month: "short",
      year: "2-digit",
    });

    const bucket = buckets.find((b) => b.month === label);
    if (!bucket) continue;

    const amt = Math.abs(Number(tx.amount) || 0);
    if (tx.type === "income") bucket.income += amt;
    else bucket.expenses += amt;
  }

  return buckets.map((b) => ({
    month: b.month,
    income: Math.round(b.income * 100) / 100,
    expenses: Math.round(b.expenses * 100) / 100,
  }));
}
