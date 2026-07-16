import type { IntelligenceSnapshot } from "@/lib/automation/types";
import type { IncomeTimingProfile } from "@/lib/automation/types";
import { formatGhs } from "@/lib/automation/format";

export interface GeneratedInsight {
  recommendation: string;
  priority: "low" | "medium" | "high";
  metadata: Record<string, unknown>;
}

/**
 * Plain-language business insights from transactions + forecasts.
 */
export function generateBusinessInsights(
  snapshot: IntelligenceSnapshot,
  incomeProfile: IncomeTimingProfile | null,
  virtualReserve: number,
): GeneratedInsight[] {
  const insights: GeneratedInsight[] = [];
  const { transactions, patterns, cashFlowForecast, totalBalance } = snapshot;
  const now = new Date();

  const last30 = new Date(now);
  last30.setDate(last30.getDate() - 30);
  const prev30 = new Date(last30);
  prev30.setDate(prev30.getDate() - 30);

  const inRange = (t: { date: string | Date }, start: Date, end: Date) => {
    const d = new Date(t.date);
    return d >= start && d < end;
  };

  const recent = transactions.filter((t) => inRange(t, last30, now));
  const prior = transactions.filter((t) => inRange(t, prev30, last30));

  const sumType = (list: typeof transactions, type: string) =>
    list
      .filter((t) => t.type === type)
      .reduce((s, t) => s + t.amount, 0);

  const recentIncome = sumType(recent, "income");
  const priorIncome = sumType(prior, "income");
  const recentExpense = sumType(recent, "expense");
  const priorExpense = sumType(prior, "expense");
  const recentNet = recentIncome - recentExpense;
  const priorNet = priorIncome - priorExpense;

  if (recentNet < priorNet && priorNet > 0) {
    const parts: string[] = [];
    if (recentExpense > priorExpense * 1.1) {
      const topCat = getTopCategoryIncrease(recent, prior);
      if (topCat) parts.push(`increased ${topCat} spending`);
      else parts.push("higher expenses");
    }
    if (recentIncome < priorIncome * 0.9) {
      parts.push("lower income");
    }
    const reason =
      parts.length > 0 ? parts.join(" and ") : "mixed cash-flow changes";
    insights.push({
      recommendation: `Cash flow has reduced over the last 30 days due to ${reason}.`,
      priority: recentNet < 0 ? "high" : "medium",
      metadata: { source: "insight_automation", type: "cash_flow_trend" },
    });
  } else if (recentNet > priorNet && recentNet > 0) {
    insights.push({
      recommendation:
        "Cash flow improved compared to the prior month — maintain current discipline on discretionary categories.",
      priority: "low",
      metadata: { source: "insight_automation", type: "positive_trend" },
    });
  }

  const weekendSpend = recent
    .filter((t) => t.type === "expense")
    .filter((t) => {
      const d = new Date(t.date).getDay();
      return d === 0 || d === 6;
    })
    .reduce((s, t) => s + t.amount, 0);
  const weekdaySpend = recentExpense - weekendSpend;
  if (weekendSpend > 0 && weekdaySpend > 0 && weekendSpend < weekdaySpend * 0.35) {
    insights.push({
      recommendation:
        "Lower weekend sales or spending may be weighing on net cash flow — review weekend revenue and supplier payment timing.",
      priority: "medium",
      metadata: { source: "insight_automation", type: "weekend_pattern" },
    });
  }

  const increasing = patterns.filter(
    (p) => p.trend.direction === "increasing" && p.confidence > 0.6,
  );
  if (increasing.length > 0) {
    const names = increasing.slice(0, 2).map((p) => p.category).join(", ");
    insights.push({
      recommendation: `Spending is trending up in ${names}. Set or review category budgets before limits are breached.`,
      priority: "medium",
      metadata: {
        source: "insight_automation",
        type: "category_trend",
        categories: increasing.map((p) => p.category),
      },
    });
  }

  const end30 = cashFlowForecast[29];
  if (end30 && end30.balance < totalBalance * 0.85) {
    insights.push({
      recommendation: `Projected balance in 30 days (${formatGhs(end30.balance)}) is below today's ledger. Plan for ${formatGhs(virtualReserve)} precautionary reserve.`,
      priority: "high",
      metadata: { source: "insight_automation", type: "forecast_outlook" },
    });
  }

  if (incomeProfile?.note && !incomeProfile.isIrregular) {
    insights.push({
      recommendation: incomeProfile.note,
      priority: "low",
      metadata: {
        source: "insight_automation",
        type: "income_timing",
        peakDays: incomeProfile.peakDaysOfWeek,
      },
    });
  }

  return insights.slice(0, 6);
}

function getTopCategoryIncrease(
  recent: { category?: string; type: string; amount: number }[],
  prior: { category?: string; type: string; amount: number }[],
): string | null {
  const byCat = (list: typeof recent) => {
    const m = new Map<string, number>();
    for (const t of list.filter((x) => x.type === "expense")) {
      const c = t.category || "Other";
      m.set(c, (m.get(c) ?? 0) + t.amount);
    }
    return m;
  };
  const r = byCat(recent);
  const p = byCat(prior);
  let best: { cat: string; delta: number } | null = null;
  for (const [cat, amt] of r) {
    const delta = amt - (p.get(cat) ?? 0);
    if (delta > 0 && (!best || delta > best.delta)) {
      best = { cat, delta };
    }
  }
  return best?.cat ?? null;
}
