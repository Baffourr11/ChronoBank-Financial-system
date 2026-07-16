// Path: lib/analytics/Forecaster.ts
import { ITransaction } from "../models/Transaction";
import { SpendingPattern } from "./PatternDetector";

export interface Forecast {
  period: string;
  predictedAmount: number;
  confidence: number;
  range: { min: number; max: number };
  factors: string[];
}

export interface CashFlowForecast {
  date: string;
  income: number;
  expenses: number;
  netCashFlow: number;
  balance: number;
  confidence: number;
}

export interface SeasonalForecast {
  month: string;
  predictedSpending: number;
  seasonalMultiplier: number;
  confidence: number;
}

/** Daily points for spending forecast charts */
export interface DailySpendingForecast {
  date: string;
  predicted: number;
  minRange: number;
  maxRange: number;
  actual?: number;
}

export class Forecaster {
  /**
   * Daily spending series for live charts (predicted + confidence band).
   * Includes recent historical actuals when available.
   */
  static generateDailySpendingForecast(
    transactions: ITransaction[],
    patterns: SpendingPattern[],
    forecastDays = 90,
    historyDays = 30,
  ): DailySpendingForecast[] {
    const expenseTransactions = transactions.filter((t) => t.type === "expense");
    const expensePattern = this.analyzeExpensePattern(transactions);
    const volatility = this.calculateVolatility(expenseTransactions);

    const actualByDate = new Map<string, number>();
    for (const t of expenseTransactions) {
      const key = new Date(t.date).toISOString().split("T")[0];
      actualByDate.set(key, (actualByDate.get(key) ?? 0) + t.amount);
    }

    const totalHistorical = expenseTransactions.reduce(
      (sum, t) => sum + t.amount,
      0,
    );
    const uniqueDays = new Set(
      expenseTransactions.map((t) =>
        new Date(t.date).toISOString().split("T")[0],
      ),
    ).size;
    const avgDailySpend =
      uniqueDays > 0
        ? totalHistorical / uniqueDays
        : expensePattern.averageExpenses;

    const forecasts: DailySpendingForecast[] = [];
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (let i = -historyDays; i < forecastDays; i++) {
      const forecastDate = new Date(currentDate);
      forecastDate.setDate(currentDate.getDate() + i);
      const dateStr = forecastDate.toISOString().split("T")[0];
      const actual = actualByDate.get(dateStr);

      if (i < 0) {
        if (actual != null && actual > 0) {
          forecasts.push({
            date: dateStr,
            predicted: actual,
            minRange: actual,
            maxRange: actual,
            actual,
          });
        }
        continue;
      }

      let predicted = this.predictDailyExpenses(
        expensePattern,
        forecastDate.getDay(),
        forecastDate.getDate() - 1,
        forecastDate.getMonth(),
      );

      for (const pattern of patterns) {
        if (pattern.confidence > 0.7) {
          predicted += (pattern.averageAmount * pattern.frequency) / 30;
        }
      }

      if (predicted <= 0 && avgDailySpend > 0) {
        predicted = avgDailySpend;
      }

      const vol = Math.max(volatility, 0.12);
      const minRange = Math.max(0, predicted * (1 - vol));
      const maxRange = predicted * (1 + vol);

      forecasts.push({
        date: dateStr,
        predicted,
        minRange,
        maxRange,
        ...(actual != null && actual > 0 ? { actual } : {}),
      });
    }

    return forecasts;
  }

  static generateSpendingForecast(
    transactions: ITransaction[],
    patterns: SpendingPattern[],
    forecastDays = 90,
  ): Forecast[] {
    const forecasts: Forecast[] = [];
    const currentDate = new Date();

    // Generate forecasts for different time periods
    const periods = [
      { name: "Next 7 days", days: 7 },
      { name: "Next 30 days", days: 30 },
      { name: "Next 90 days", days: 90 },
    ];

    for (const period of periods) {
      const forecast = this.calculatePeriodForecast(
        transactions,
        patterns,
        period.name,
        period.days,
        currentDate,
      );
      forecasts.push(forecast);
    }

    return forecasts;
  }

  static generateCashFlowForecast(
    transactions: ITransaction[],
    currentBalance: number,
    forecastDays = 90,
  ): CashFlowForecast[] {
    const forecasts: CashFlowForecast[] = [];
    const currentDate = new Date();
    let runningBalance = currentBalance;

    // Analyze historical cash flow patterns
    const incomePattern = this.analyzeIncomePattern(transactions);
    const expensePattern = this.analyzeExpensePattern(transactions);

    for (let i = 0; i < forecastDays; i++) {
      const forecastDate = new Date(currentDate);
      forecastDate.setDate(currentDate.getDate() + i);

      const dayOfWeek = forecastDate.getDay();
      const dayOfMonth = forecastDate.getDate();
      const month = forecastDate.getMonth();

      // Predict income for this day
      const dailyIncome = this.predictDailyIncome(
        incomePattern,
        dayOfWeek,
        dayOfMonth,
        month,
      );

      // Predict expenses for this day
      const dailyExpenses = this.predictDailyExpenses(
        expensePattern,
        dayOfWeek,
        dayOfMonth,
        month,
      );

      const netCashFlow = dailyIncome - dailyExpenses;
      runningBalance += netCashFlow;

      const confidence = this.calculateDailyConfidence(
        dailyIncome,
        dailyExpenses,
        i,
      );

      forecasts.push({
        date: forecastDate.toISOString().split("T")[0],
        income: dailyIncome,
        expenses: dailyExpenses,
        netCashFlow,
        balance: runningBalance,
        confidence,
      });
    }

    return forecasts;
  }

  static generateSeasonalForecast(
    transactions: ITransaction[],
    patterns: SpendingPattern[],
  ): SeasonalForecast[] {
    const forecasts: SeasonalForecast[] = [];
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    for (let i = 0; i < 12; i++) {
      const monthTransactions = transactions.filter((t) => {
        const date = new Date(t.date);
        return date.getMonth() === i && t.type === "expense";
      });

      const historicalAverage =
        monthTransactions.length > 0
          ? monthTransactions.reduce((sum, t) => sum + t.amount, 0) /
            monthTransactions.length
          : 0;

      // Apply seasonal multipliers based on patterns
      let seasonalMultiplier = 1;
      for (const pattern of patterns) {
        if (pattern.seasonality.hasSeasonalPattern) {
          const monthSpending = pattern.seasonality.monthly[i];
          const yearAverage =
            pattern.seasonality.monthly.reduce((sum, val) => sum + val, 0) / 12;
          seasonalMultiplier *= monthSpending / yearAverage;
        }
      }

      const predictedSpending = historicalAverage * seasonalMultiplier;
      const confidence = this.calculateSeasonalConfidence(
        monthTransactions.length,
        patterns,
      );

      forecasts.push({
        month: months[i],
        predictedSpending,
        seasonalMultiplier,
        confidence,
      });
    }

    return forecasts;
  }

  static detectCashFlowIssues(forecasts: CashFlowForecast[]): {
    hasIssues: boolean;
    issues: {
      date: string;
      type: "negative_balance" | "low_balance" | "cash_flow_gap";
      severity: "low" | "medium" | "high";
      description: string;
      projectedBalance: number;
    }[];
  } {
    const issues: {
      date: string;
      type: "negative_balance" | "low_balance" | "cash_flow_gap";
      severity: "low" | "medium" | "high";
      description: string;
      projectedBalance: number;
    }[] = [];
    let hasIssues = false;

    for (let i = 1; i < forecasts.length; i++) {
      const current = forecasts[i];
      const previous = forecasts[i - 1];

      // Check for negative balance
      if (current.balance < 0) {
        hasIssues = true;
        issues.push({
          date: current.date,
          type: "negative_balance",
          severity: "high",
          description: `Projected negative balance of ${current.balance.toFixed(2)}`,
          projectedBalance: current.balance,
        });
      }

      // Check for low balance (less than 20% of starting balance)
      const startingBalance = forecasts[0].balance;
      if (current.balance < startingBalance * 0.2 && current.balance > 0) {
        hasIssues = true;
        issues.push({
          date: current.date,
          type: "low_balance",
          severity: "medium",
          description: `Low balance warning: ${current.balance.toFixed(2)}`,
          projectedBalance: current.balance,
        });
      }

      // Check for significant cash flow gaps
      const cashFlowGap = Math.abs(current.netCashFlow);
      const averageCashFlow =
        forecasts.reduce((sum, f) => sum + Math.abs(f.netCashFlow), 0) /
        forecasts.length;

      if (cashFlowGap > averageCashFlow * 2) {
        hasIssues = true;
        issues.push({
          date: current.date,
          type: "cash_flow_gap",
          severity: current.netCashFlow < 0 ? "high" : "medium",
          description: `Large cash flow gap: ${current.netCashFlow.toFixed(2)}`,
          projectedBalance: current.balance,
        });
      }
    }

    return { hasIssues, issues };
  }

  private static calculatePeriodForecast(
    transactions: ITransaction[],
    patterns: SpendingPattern[],
    periodName: string,
    days: number,
    currentDate: Date,
  ): Forecast {
    const endDate = new Date(currentDate);
    endDate.setDate(currentDate.getDate() + days);

    // Get historical data for similar period
    const historicalData = transactions.filter((t) => {
      const date = new Date(t.date);
      return date >= currentDate && date <= endDate && t.type === "expense";
    });

    // Base prediction on historical average
    const historicalAverage =
      historicalData.length > 0
        ? historicalData.reduce((sum, t) => sum + t.amount, 0) /
          historicalData.length
        : 0;

    // Adjust based on patterns
    let predictedAmount = historicalAverage;
    const factors: string[] = [];

    for (const pattern of patterns) {
      if (pattern.confidence > 0.7) {
        const patternContribution =
          pattern.averageAmount * pattern.frequency * (days / 30);
        predictedAmount += patternContribution;
        factors.push(
          `${pattern.category} pattern (${(pattern.confidence * 100).toFixed(0)}% confidence)`,
        );
      }
    }

    // Calculate confidence based on data quality
    const confidence = this.calculatePeriodConfidence(
      historicalData.length,
      patterns,
      days,
    );

    // Calculate range based on volatility
    const volatility = this.calculateVolatility(historicalData);
    const range = {
      min: predictedAmount * (1 - volatility),
      max: predictedAmount * (1 + volatility),
    };

    return {
      period: periodName,
      predictedAmount,
      confidence,
      range,
      factors,
    };
  }

  private static analyzeIncomePattern(transactions: ITransaction[]) {
    const incomeTransactions = transactions.filter((t) => t.type === "income");

    // Group by day of week
    const dayOfWeekIncome = new Array(7).fill(0);
    const dayOfWeekCount = new Array(7).fill(0);

    // Group by day of month
    const dayOfMonthIncome = new Array(31).fill(0);
    const dayOfMonthCount = new Array(31).fill(0);

    // Group by month
    const monthlyIncome = new Array(12).fill(0);
    const monthlyCount = new Array(12).fill(0);

    for (const transaction of incomeTransactions) {
      const date = new Date(transaction.date);
      const dayOfWeek = date.getDay();
      const dayOfMonth = date.getDate() - 1; // 0-indexed
      const month = date.getMonth();

      dayOfWeekIncome[dayOfWeek] += transaction.amount;
      dayOfWeekCount[dayOfWeek]++;

      dayOfMonthIncome[dayOfMonth] += transaction.amount;
      dayOfMonthCount[dayOfMonth]++;

      monthlyIncome[month] += transaction.amount;
      monthlyCount[month]++;
    }

    return {
      dayOfWeekIncome: dayOfWeekIncome.map((sum, i) =>
        dayOfWeekCount[i] > 0 ? sum / dayOfWeekCount[i] : 0,
      ),
      dayOfMonthIncome: dayOfMonthIncome.map((sum, i) =>
        dayOfMonthCount[i] > 0 ? sum / dayOfMonthCount[i] : 0,
      ),
      monthlyIncome: monthlyIncome.map((sum, i) =>
        monthlyCount[i] > 0 ? sum / monthlyCount[i] : 0,
      ),
      averageIncome:
        incomeTransactions.length > 0
          ? incomeTransactions.reduce((sum, t) => sum + t.amount, 0) /
            incomeTransactions.length
          : 0,
    };
  }

  private static analyzeExpensePattern(transactions: ITransaction[]) {
    const expenseTransactions = transactions.filter(
      (t) => t.type === "expense",
    );

    // Similar grouping as income
    const dayOfWeekExpenses = new Array(7).fill(0);
    const dayOfWeekCount = new Array(7).fill(0);

    const dayOfMonthExpenses = new Array(31).fill(0);
    const dayOfMonthCount = new Array(31).fill(0);

    const monthlyExpenses = new Array(12).fill(0);
    const monthlyCount = new Array(12).fill(0);

    for (const transaction of expenseTransactions) {
      const date = new Date(transaction.date);
      const dayOfWeek = date.getDay();
      const dayOfMonth = date.getDate() - 1;
      const month = date.getMonth();

      dayOfWeekExpenses[dayOfWeek] += transaction.amount;
      dayOfWeekCount[dayOfWeek]++;

      dayOfMonthExpenses[dayOfMonth] += transaction.amount;
      dayOfMonthCount[dayOfMonth]++;

      monthlyExpenses[month] += transaction.amount;
      monthlyCount[month]++;
    }

    return {
      dayOfWeekExpenses: dayOfWeekExpenses.map((sum, i) =>
        dayOfWeekCount[i] > 0 ? sum / dayOfWeekCount[i] : 0,
      ),
      dayOfMonthExpenses: dayOfMonthExpenses.map((sum, i) =>
        dayOfMonthCount[i] > 0 ? sum / dayOfMonthCount[i] : 0,
      ),
      monthlyExpenses: monthlyExpenses.map((sum, i) =>
        monthlyCount[i] > 0 ? sum / monthlyCount[i] : 0,
      ),
      averageExpenses:
        expenseTransactions.length > 0
          ? expenseTransactions.reduce((sum, t) => sum + t.amount, 0) /
            expenseTransactions.length
          : 0,
    };
  }

  private static predictDailyIncome(
    incomePattern: any,
    dayOfWeek: number,
    dayOfMonth: number,
    month: number,
  ): number {
    // Combine different patterns with weights
    const dayOfWeekWeight = 0.4;
    const dayOfMonthWeight = 0.3;
    const monthlyWeight = 0.3;

    const dayOfWeekContribution =
      incomePattern.dayOfWeekIncome[dayOfWeek] * dayOfWeekWeight;
    const dayOfMonthContribution =
      incomePattern.dayOfMonthIncome[dayOfMonth] * dayOfMonthWeight;
    const monthlyContribution =
      incomePattern.monthlyIncome[month] * monthlyWeight;

    return dayOfWeekContribution + dayOfMonthContribution + monthlyContribution;
  }

  private static predictDailyExpenses(
    expensePattern: any,
    dayOfWeek: number,
    dayOfMonth: number,
    month: number,
  ): number {
    const dayOfWeekWeight = 0.4;
    const dayOfMonthWeight = 0.3;
    const monthlyWeight = 0.3;

    const dayOfWeekContribution =
      expensePattern.dayOfWeekExpenses[dayOfWeek] * dayOfWeekWeight;
    const dayOfMonthContribution =
      expensePattern.dayOfMonthExpenses[dayOfMonth] * dayOfMonthWeight;
    const monthlyContribution =
      expensePattern.monthlyExpenses[month] * monthlyWeight;

    return dayOfWeekContribution + dayOfMonthContribution + monthlyContribution;
  }

  private static calculateDailyConfidence(
    income: number,
    expenses: number,
    daysOut: number,
  ): number {
    // Confidence decreases as we forecast further into the future
    const baseConfidence = 0.8;
    const decayRate = 0.01; // 1% confidence loss per day

    let confidence = baseConfidence - daysOut * decayRate;

    // Adjust based on income/expense ratio stability
    if (income > 0 && expenses > 0) {
      const ratio = income / expenses;
      if (ratio > 0.8 && ratio < 1.2) {
        // Stable cash flow
        confidence += 0.1;
      }
    }

    return Math.max(Math.min(confidence, 1), 0.1);
  }

  private static calculatePeriodConfidence(
    dataPoints: number,
    patterns: SpendingPattern[],
    days: number,
  ): number {
    let confidence = 0.5;

    // More historical data increases confidence
    const dataConfidence = Math.min(dataPoints / 10, 1) * 0.3;
    confidence += dataConfidence;

    // Strong patterns increase confidence
    const patternConfidence =
      (patterns.reduce((sum, pattern) => sum + pattern.confidence, 0) /
        patterns.length) *
      0.2;
    confidence += patternConfidence;

    // Shorter forecasts have higher confidence
    const timeConfidence = Math.max(0, 1 - days / 365) * 0.2;
    confidence += timeConfidence;

    return Math.min(confidence, 1);
  }

  private static calculateSeasonalConfidence(
    dataPoints: number,
    patterns: SpendingPattern[],
  ): number {
    let confidence = 0.4;

    // Data availability
    confidence += Math.min(dataPoints / 5, 1) * 0.3;

    // Pattern strength
    const seasonalPatterns = patterns.filter(
      (p) => p.seasonality.hasSeasonalPattern,
    );
    if (seasonalPatterns.length > 0) {
      confidence += 0.3;
    }

    return Math.min(confidence, 1);
  }

  private static calculateVolatility(transactions: ITransaction[]): number {
    if (transactions.length < 2) return 0.5; // Default volatility

    const amounts = transactions.map((t) => t.amount);
    const mean = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
    const variance =
      amounts.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) /
      amounts.length;
    const stdDev = Math.sqrt(variance);

    return (stdDev / mean) * 0.5; // Normalize to reasonable range
  }
}
