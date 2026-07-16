import type { ITransaction } from "@/lib/models/Transaction";
import type { IncomeTimingProfile } from "@/lib/automation/types";
import { dayLabel } from "@/lib/automation/format";

const DAY_MS = 86400000;

/**
 * Learns income timing (weekly cycles, irregular flows) for forecast/alert calibration.
 */
export function analyzeIncomeTiming(
  transactions: ITransaction[],
): IncomeTimingProfile | null {
  const income = transactions.filter((t) => t.type === "income");
  if (income.length < 3) return null;

  const byDay = new Array(7).fill(0).map(() => ({ sum: 0, count: 0 }));
  for (const t of income) {
    const d = new Date(t.date).getDay();
    byDay[d].sum += t.amount;
    byDay[d].count += 1;
  }

  const peakDaysOfWeek = byDay
    .map((v, day) => ({
      day,
      label: dayLabel(day),
      avgAmount: v.count > 0 ? v.sum / v.count : 0,
      total: v.sum,
    }))
    .filter((d) => d.avgAmount > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 2)
    .map(({ day, label, avgAmount }) => ({ day, label, avgAmount }));

  const amounts = income.map((t) => t.amount);
  const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const variance =
    amounts.reduce((s, a) => s + (a - mean) ** 2, 0) / amounts.length;
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;
  const isIrregular = cv > 0.5;

  const sorted = [...income].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const lastDate = new Date(sorted[0].date);
  const intervals: number[] = [];
  for (let i = 1; i < Math.min(sorted.length, 12); i++) {
    const prev = new Date(sorted[i].date);
    intervals.push(
      Math.round((lastDate.getTime() - prev.getTime()) / DAY_MS),
    );
    lastDate.setTime(prev.getTime());
  }
  const medianInterval =
    intervals.length > 0
      ? intervals.sort((a, b) => a - b)[Math.floor(intervals.length / 2)]
      : 14;

  const daysSinceLast = Math.floor(
    (Date.now() - new Date(sorted[0].date).getTime()) / DAY_MS,
  );
  const nextExpectedInflowDays = Math.max(0, medianInterval - daysSinceLast);

  const topDay = peakDaysOfWeek[0];
  let note = "Income timing analyzed for alert calibration.";
  if (topDay && !isIrregular) {
    note = `Regular inflows usually occur on ${topDay.label}s; low-balance warnings may be delayed pending expected income.`;
  } else if (isIrregular) {
    note =
      "Irregular customer payment patterns detected; forecast sensitivity recalibrated for variable inflows.";
  }

  return {
    peakDaysOfWeek,
    isIrregular,
    nextExpectedInflowDays:
      nextExpectedInflowDays <= medianInterval ? nextExpectedInflowDays : null,
    note,
  };
}

/** Days to add before firing low-balance warnings when income is expected soon */
export function incomeAlertDelayDays(profile: IncomeTimingProfile | null): number {
  if (!profile || profile.isIrregular) return 0;
  if (
    profile.nextExpectedInflowDays != null &&
    profile.nextExpectedInflowDays <= 3
  ) {
    return profile.nextExpectedInflowDays;
  }
  return 0;
}
