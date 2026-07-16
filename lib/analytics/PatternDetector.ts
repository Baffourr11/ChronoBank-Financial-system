import { ITransaction } from '../models/Transaction';

export interface SpendingPattern {
  category: string;
  averageAmount: number;
  frequency: number;
  seasonality: SeasonalityPattern;
  trend: TrendPattern;
  confidence: number;
}

export interface SeasonalityPattern {
  monthly: number[];
  weekly: number[];
  yearly: number[];
  hasSeasonalPattern: boolean;
  peakSeason: string;
  lowSeason: string;
}

export interface TrendPattern {
  direction: 'increasing' | 'decreasing' | 'stable';
  slope: number;
  correlation: number;
  volatility: number;
}

export interface Anomaly {
  transactionId: string;
  type: 'amount' | 'frequency' | 'timing' | 'category';
  severity: 'low' | 'medium' | 'high';
  description: string;
  expectedValue: number;
  actualValue: number;
  confidence: number;
}

export class PatternDetector {
  static detectSpendingPatterns(transactions: ITransaction[], lookbackDays = 365): SpendingPattern[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);
    
    const relevantTransactions = transactions.filter(t => 
      new Date(t.date) >= cutoffDate && t.type === 'expense'
    );

    const categoryGroups = this.groupByCategory(relevantTransactions);
    const patterns: SpendingPattern[] = [];

    for (const [category, categoryTransactions] of Object.entries(categoryGroups)) {
      if (categoryTransactions.length < 3) continue; // Need minimum data points

      const pattern = this.analyzeCategoryPattern(category, categoryTransactions);
      patterns.push(pattern);
    }

    return patterns.sort((a, b) => b.confidence - a.confidence);
  }

  static detectAnomalies(transactions: ITransaction[], patterns: SpendingPattern[]): Anomaly[] {
    const anomalies: Anomaly[] = [];

    for (const transaction of transactions) {
      if (transaction.type !== 'expense') continue;

      const pattern = patterns.find(p => p.category === transaction.category);
      if (!pattern) continue;

      // Amount anomaly
      const amountZScore = this.calculateZScore(
        transaction.amount, 
        pattern.averageAmount, 
        this.calculateStandardDeviation(
          transactions.filter(t => t.category === transaction.category).map(t => t.amount)
        )
      );

      if (Math.abs(amountZScore) > 2.5) {
        anomalies.push({
          transactionId: String(transaction._id ?? ""),
          type: 'amount',
          severity: Math.abs(amountZScore) > 3.5 ? 'high' : 'medium',
          description: `Unusual amount in ${transaction.category}`,
          expectedValue: pattern.averageAmount,
          actualValue: transaction.amount,
          confidence: Math.min(Math.abs(amountZScore) / 3, 1)
        });
      }

      // Frequency anomaly
      const recentTransactions = transactions.filter(t => 
        t.category === transaction.category &&
        new Date(t.date).getMonth() === new Date(transaction.date).getMonth() &&
        new Date(t.date).getFullYear() === new Date(transaction.date).getFullYear()
      );

      if (recentTransactions.length > pattern.frequency * 2) {
        anomalies.push({
          transactionId: String(transaction._id ?? ""),
          type: 'frequency',
          severity: 'medium',
          description: `Unusually high frequency in ${transaction.category}`,
          expectedValue: pattern.frequency,
          actualValue: recentTransactions.length,
          confidence: 0.7
        });
      }
    }

    return anomalies;
  }

  private static groupByCategory(transactions: ITransaction[]): Record<string, ITransaction[]> {
    return transactions.reduce((groups, transaction) => {
      const category = transaction.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(transaction);
      return groups;
    }, {} as Record<string, ITransaction[]>);
  }

  private static analyzeCategoryPattern(category: string, transactions: ITransaction[]): SpendingPattern {
    const amounts = transactions.map(t => t.amount);
    const averageAmount = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
    
    // Frequency (transactions per month)
    const frequency = this.calculateMonthlyFrequency(transactions);
    
    // Seasonality
    const seasonality = this.analyzeSeasonality(transactions);
    
    // Trend
    const trend = this.analyzeTrend(transactions);
    
    // Confidence based on data quality and pattern strength
    const confidence = this.calculateConfidence(transactions, seasonality, trend);

    return {
      category,
      averageAmount,
      frequency,
      seasonality,
      trend,
      confidence
    };
  }

  private static calculateMonthlyFrequency(transactions: ITransaction[]): number {
    if (transactions.length === 0) return 0;
    
    const dates = transactions.map(t => new Date(t.date));
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    const monthsDiff = (maxDate.getFullYear() - minDate.getFullYear()) * 12 + 
                      (maxDate.getMonth() - minDate.getMonth()) + 1;
    
    return transactions.length / monthsDiff;
  }

  private static analyzeSeasonality(transactions: ITransaction[]): SeasonalityPattern {
    const monthlySpending = new Array(12).fill(0);
    const weeklySpending = new Array(7).fill(0);
    const yearlySpending = new Array(12).fill(0); // For multi-year data

    for (const transaction of transactions) {
      const date = new Date(transaction.date);
      monthlySpending[date.getMonth()] += transaction.amount;
      weeklySpending[date.getDay()] += transaction.amount;
    }

    // Detect seasonal patterns
    const monthlyAvg = monthlySpending.reduce((sum, val) => sum + val, 0) / 12;
    const monthlyVariance = monthlySpending.reduce((sum, val) => sum + Math.pow(val - monthlyAvg, 2), 0) / 12;
    const hasSeasonalPattern = monthlyVariance > monthlyAvg * 0.3; // 30% variance threshold

    const peakMonth = monthlySpending.indexOf(Math.max(...monthlySpending));
    const lowMonth = monthlySpending.indexOf(Math.min(...monthlySpending));

    return {
      monthly: monthlySpending,
      weekly: weeklySpending,
      yearly: yearlySpending,
      hasSeasonalPattern,
      peakSeason: this.getMonthName(peakMonth),
      lowSeason: this.getMonthName(lowMonth)
    };
  }

  private static analyzeTrend(transactions: ITransaction[]): TrendPattern {
    const sortedTransactions = transactions.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const amounts = sortedTransactions.map(t => t.amount);
    const timePoints = sortedTransactions.map((_, index) => index);

    // Linear regression
    const n = amounts.length;
    const sumX = timePoints.reduce((sum, x) => sum + x, 0);
    const sumY = amounts.reduce((sum, y) => sum + y, 0);
    const sumXY = timePoints.reduce((sum, x, i) => sum + x * amounts[i], 0);
    const sumX2 = timePoints.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const correlation = this.calculateCorrelation(timePoints, amounts);
    const volatility = this.calculateStandardDeviation(amounts) / (amounts.reduce((sum, a) => sum + a, 0) / amounts.length);

    let direction: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (Math.abs(slope) > 0.01) {
      direction = slope > 0 ? 'increasing' : 'decreasing';
    }

    return {
      direction,
      slope,
      correlation,
      volatility
    };
  }

  private static calculateConfidence(
    transactions: ITransaction[], 
    seasonality: SeasonalityPattern, 
    trend: TrendPattern
  ): number {
    let confidence = 0.5; // Base confidence

    // More data points increase confidence
    const dataPoints = Math.min(transactions.length / 12, 1); // Normalize to 0-1
    confidence += dataPoints * 0.2;

    // Strong seasonality increases confidence
    if (seasonality.hasSeasonalPattern) {
      confidence += 0.15;
    }

    // Strong correlation increases confidence
    confidence += Math.abs(trend.correlation) * 0.15;

    return Math.min(confidence, 1);
  }

  private static calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private static calculateZScore(value: number, mean: number, stdDev: number): number {
    if (stdDev === 0) return 0;
    return (value - mean) / stdDev;
  }

  private static calculateCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
    const sumY2 = y.reduce((sum, val) => sum + val * val, 0);

    const correlation = (n * sumXY - sumX * sumY) / 
      Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return isNaN(correlation) ? 0 : correlation;
  }

  private static getMonthName(monthIndex: number): string {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December'];
    return months[monthIndex];
  }

  // Ghanaian-specific pattern detection
  static detectGhanaianPatterns(transactions: ITransaction[]): {
    paydaySpending: boolean;
    seasonalFestivals: string[];
    informalSectorPatterns: string[];
  } {
    const patterns = {
      paydaySpending: false,
      seasonalFestivals: [] as string[],
      informalSectorPatterns: [] as string[]
    };

    // Detect payday patterns (typically end of month in Ghana)
    const endOfMonthTransactions = transactions.filter(t => {
      const date = new Date(t.date);
      return date.getDate() >= 25 || date.getDate() <= 5;
    });

    if (endOfMonthTransactions.length > transactions.length * 0.3) {
      patterns.paydaySpending = true;
    }

    // Detect seasonal festival spending
    const festivalMonths = {
      'December': ['Christmas'],
      'April': ['Easter'],
      'August': ['Homowo'],
      'November': ['Farmers Day']
    };

    for (const [month, festivals] of Object.entries(festivalMonths)) {
      const monthTransactions = transactions.filter(t => {
        const date = new Date(t.date);
        return date.toLocaleString('default', { month: 'long' }) === month;
      });

      if (monthTransactions.length > 0) {
        const avgMonthlySpending = transactions.reduce((sum, t) => sum + t.amount, 0) / 12;
        const festivalSpending = monthTransactions.reduce((sum, t) => sum + t.amount, 0);

        if (festivalSpending > avgMonthlySpending * 1.5) {
          patterns.seasonalFestivals.push(...festivals);
        }
      }
    }

    // Detect informal sector patterns (irregular income, cash-based transactions)
    const irregularIncome = this.detectIrregularIncome(transactions);
    if (irregularIncome.isIrregular) {
      patterns.informalSectorPatterns.push('Irregular income pattern detected');
    }

    return patterns;
  }

  private static detectIrregularIncome(transactions: ITransaction[]): { isIrregular: boolean; coefficient: number } {
    const incomeTransactions = transactions.filter(t => t.type === 'income');
    if (incomeTransactions.length < 3) return { isIrregular: false, coefficient: 0 };

    const amounts = incomeTransactions.map(t => t.amount);
    const mean = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
    const stdDev = this.calculateStandardDeviation(amounts);
    const coefficient = stdDev / mean;

    return {
      isIrregular: coefficient > 0.5, // High variability indicates irregular income
      coefficient
    };
  }
}
