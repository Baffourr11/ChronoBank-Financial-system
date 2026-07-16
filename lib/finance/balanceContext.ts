export interface WalletBalanceContext {
  /** ISO date of the newest completed transaction in the dataset */
  balanceAsOf: string | null;
  datasetRangeStart: string | null;
  datasetRangeEnd: string | null;
  yearToDateIncome: number;
  yearToDateExpenses: number;
  yearToDateNet: number;
  /** True when the latest transaction is older than staleThresholdDays */
  isDataStale: boolean;
  daysSinceLastTransaction: number | null;
}

const STALE_THRESHOLD_DAYS = 30;

export function buildBalanceContext(
  transactions: Array<{ type: string; amount: number | string; date: string }>,
  datasetRange?: { start?: string | null; end?: string | null },
  now: Date = new Date(),
): WalletBalanceContext {
  const yearStart = new Date(now.getFullYear(), 0, 1);
  let balanceAsOf: Date | null = null;
  let rangeStart: Date | null = null;

  let yearToDateIncome = 0;
  let yearToDateExpenses = 0;

  for (const tx of transactions) {
    const d = new Date(tx.date);
    if (Number.isNaN(d.getTime())) continue;

    if (!balanceAsOf || d > balanceAsOf) balanceAsOf = d;
    if (!rangeStart || d < rangeStart) rangeStart = d;

    if (d >= yearStart) {
      const amount = Number(tx.amount) || 0;
      if (tx.type === "income") yearToDateIncome += amount;
      else if (tx.type === "expense") yearToDateExpenses += amount;
    }
  }

  const daysSinceLastTransaction =
    balanceAsOf != null
      ? Math.floor(
          (now.getTime() - balanceAsOf.getTime()) / (1000 * 60 * 60 * 24),
        )
      : null;

  return {
    balanceAsOf: balanceAsOf?.toISOString() ?? null,
    datasetRangeStart:
      datasetRange?.start ?? rangeStart?.toISOString() ?? null,
    datasetRangeEnd: datasetRange?.end ?? balanceAsOf?.toISOString() ?? null,
    yearToDateIncome,
    yearToDateExpenses,
    yearToDateNet: yearToDateIncome - yearToDateExpenses,
    isDataStale:
      daysSinceLastTransaction != null &&
      daysSinceLastTransaction > STALE_THRESHOLD_DAYS,
    daysSinceLastTransaction,
  };
}

export function formatBalanceAsOf(iso: string | null): string {
  if (!iso) return "No transactions yet";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown date";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
