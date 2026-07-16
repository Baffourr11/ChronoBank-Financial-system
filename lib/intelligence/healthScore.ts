export interface HealthScoreInput {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  transactionCount: number;
  hasEnoughData: boolean;
  historyDays: number;
  unreadAlerts: number;
  cashFlowRiskSeverity?: "low" | "medium" | "high" | null;
  activeRecommendationsHigh?: number;
  warningLevel?: 1 | 2 | 3 | null;
}

export interface HealthScoreResult {
  score: number;
  label: "Excellent" | "Good" | "Fair" | "At Risk";
  factors: { name: string; impact: number; note: string }[];
}

export function computeHealthScore(input: HealthScoreInput): HealthScoreResult {
  let score = 50;
  const factors: HealthScoreResult["factors"] = [];

  if (input.hasEnoughData && input.transactionCount >= 20) {
    score += 15;
    factors.push({ name: "Data quality", impact: 15, note: "Sufficient transaction history" });
  } else if (input.transactionCount >= 5) {
    score += 5;
    factors.push({ name: "Data quality", impact: 5, note: "Limited history — upload more data" });
  } else {
    score -= 10;
    factors.push({ name: "Data quality", impact: -10, note: "Not enough data for reliable insights" });
  }

  if (input.historyDays >= 90) {
    score += 10;
    factors.push({ name: "History length", impact: 10, note: `${input.historyDays} days of data` });
  } else if (input.historyDays >= 30) {
    score += 5;
    factors.push({ name: "History length", impact: 5, note: `${input.historyDays} days of data` });
  }

  const netMonthly = input.monthlyIncome - input.monthlyExpenses;
  if (netMonthly > 0) {
    score += 15;
    factors.push({ name: "Cash flow", impact: 15, note: "Positive monthly net" });
  } else if (netMonthly === 0) {
    score += 5;
    factors.push({ name: "Cash flow", impact: 5, note: "Break-even monthly" });
  } else {
    score -= 15;
    factors.push({ name: "Cash flow", impact: -15, note: "Expenses exceed income this month" });
  }

  if (input.totalBalance > 0) {
    score += 10;
    factors.push({ name: "Balance", impact: 10, note: "Positive total balance" });
  } else {
    score -= 20;
    factors.push({ name: "Balance", impact: -20, note: "Negative or zero balance" });
  }

  if (input.warningLevel === 3) {
    score -= 20;
    factors.push({
      name: "Early warning",
      impact: -20,
      note: "Critical liquidity alert active",
    });
  } else if (input.warningLevel === 2) {
    score -= 12;
    factors.push({
      name: "Early warning",
      impact: -12,
      note: "Cash-flow warning alert active",
    });
  } else if (input.warningLevel === 1) {
    score -= 5;
    factors.push({
      name: "Early warning",
      impact: -5,
      note: "Minor cash-flow notice",
    });
  }

  if (input.cashFlowRiskSeverity === "high") {
    score -= 25;
    factors.push({ name: "Forecast risk", impact: -25, note: "High cash-flow risk detected" });
  } else if (input.cashFlowRiskSeverity === "medium") {
    score -= 12;
    factors.push({ name: "Forecast risk", impact: -12, note: "Moderate cash-flow risk" });
  } else if (input.cashFlowRiskSeverity === "low") {
    score -= 5;
    factors.push({ name: "Forecast risk", impact: -5, note: "Minor cash-flow warning" });
  } else {
    score += 5;
    factors.push({ name: "Forecast risk", impact: 5, note: "No imminent cash-flow issues" });
  }

  if (input.unreadAlerts > 3) {
    score -= Math.min(15, input.unreadAlerts * 3);
    factors.push({
      name: "Alerts",
      impact: -Math.min(15, input.unreadAlerts * 3),
      note: `${input.unreadAlerts} unread alerts`,
    });
  }

  if ((input.activeRecommendationsHigh ?? 0) > 0) {
    score -= 5;
    factors.push({
      name: "Recommendations",
      impact: -5,
      note: "High-priority actions suggested",
    });
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let label: HealthScoreResult["label"] = "Fair";
  if (score >= 80) label = "Excellent";
  else if (score >= 65) label = "Good";
  else if (score < 45) label = "At Risk";

  return { score, label, factors };
}
