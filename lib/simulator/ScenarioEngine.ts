import { ITransaction } from '../models/Transaction';
import { IAccount } from '../models/Account';

export interface Scenario {
  id: string;
  name: string;
  description: string;
  type: 'market_shock' | 'income_change' | 'expense_change' | 'investment' | 'custom';
  parameters: ScenarioParameters;
  duration: number; // in days
  createdAt: Date;
}

export interface ScenarioParameters {
  incomeChange?: number; // percentage
  expenseChange?: number; // percentage
  currencyDepreciation?: number; // percentage
  inflationRate?: number; // percentage
  interestRate?: number; // percentage
  oneTimeExpense?: number;
  oneTimeIncome?: number;
  recurringExpense?: { amount: number; frequency: 'daily' | 'weekly' | 'monthly' };
  recurringIncome?: { amount: number; frequency: 'daily' | 'weekly' | 'monthly' };
}

export interface SimulationResult {
  scenario: Scenario;
  baseline: BaselineProjection;
  stressed: StressedProjection;
  impact: ImpactAnalysis;
  recommendations: Recommendation[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface BaselineProjection {
  dailyProjections: DailyProjection[];
  finalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  cashFlowIssues: number;
}

export interface StressedProjection {
  dailyProjections: DailyProjection[];
  finalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  cashFlowIssues: number;
  lowestBalance: number;
  negativeDays: number;
}

export interface DailyProjection {
  date: string;
  balance: number;
  income: number;
  expenses: number;
  netCashFlow: number;
}

export interface ImpactAnalysis {
  balanceImpact: number;
  incomeImpact: number;
  expenseImpact: number;
  cashFlowVolatility: number;
  liquidityRisk: number;
  solvencyRisk: number;
}

export interface Recommendation {
  type: 'increase_income' | 'reduce_expenses' | 'build_emergency_fund' | 'diversify_income' | 'hedge_currency';
  priority: 'high' | 'medium' | 'low';
  description: string;
  potentialImpact: number;
  feasibility: 'easy' | 'moderate' | 'challenging';
}

export class ScenarioEngine {
  static async runScenario(
    scenario: Scenario,
    accounts: IAccount[],
    transactions: ITransaction[],
    projectionDays = 90
  ): Promise<SimulationResult> {
    // Generate baseline projection (current trends continue)
    const baseline = this.generateBaselineProjection(accounts, transactions, projectionDays);
    
    // Generate stressed projection (apply scenario parameters)
    const stressed = this.generateStressedProjection(scenario, accounts, transactions, projectionDays);
    
    // Analyze impact
    const impact = this.analyzeImpact(baseline, stressed);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(impact, scenario);
    
    // Determine risk level
    const riskLevel = this.assessRiskLevel(impact, stressed);

    return {
      scenario,
      baseline,
      stressed,
      impact,
      recommendations,
      riskLevel
    };
  }

  static createMarketShockScenarios(): Scenario[] {
    return [
      {
        id: 'currency_devaluation_20',
        name: '20% Currency Devaluation',
        description: 'Ghanaian Cedi loses 20% value against USD',
        type: 'market_shock',
        parameters: {
          currencyDepreciation: 20,
          inflationRate: 15,
          expenseChange: 10 // Imported goods become more expensive
        },
        duration: 90,
        createdAt: new Date()
      },
      {
        id: 'inflation_spike',
        name: 'High Inflation Period',
        description: 'Inflation rises to 25% for 3 months',
        type: 'market_shock',
        parameters: {
          inflationRate: 25,
          expenseChange: 20
        },
        duration: 90,
        createdAt: new Date()
      },
      {
        id: 'interest_rate_hike',
        name: 'Interest Rate Increase',
        description: 'Central bank raises rates by 5%',
        type: 'market_shock',
        parameters: {
          interestRate: 5,
          expenseChange: 5 // Higher loan payments
        },
        duration: 90,
        createdAt: new Date()
      }
    ];
  }

  static createIncomeShockScenarios(): Scenario[] {
    return [
      {
        id: 'job_loss',
        name: 'Job Loss',
        description: 'Complete loss of primary income for 60 days',
        type: 'income_change',
        parameters: {
          incomeChange: -100,
          oneTimeExpense: 500 // Job search expenses
        },
        duration: 60,
        createdAt: new Date()
      },
      {
        id: 'salary_cut',
        name: '30% Salary Reduction',
        description: 'Employer reduces salary by 30%',
        type: 'income_change',
        parameters: {
          incomeChange: -30
        },
        duration: 180,
        createdAt: new Date()
      },
      {
        id: 'business_downturn',
        name: 'Business Downturn',
        description: 'Informal business revenue drops by 50%',
        type: 'income_change',
        parameters: {
          incomeChange: -50
        },
        duration: 120,
        createdAt: new Date()
      }
    ];
  }

  static createExpenseShockScenarios(): Scenario[] {
    return [
      {
        id: 'medical_emergency',
        name: 'Medical Emergency',
        description: 'Unexpected medical expense of GHS 2,000',
        type: 'expense_change',
        parameters: {
          oneTimeExpense: 2000
        },
        duration: 30,
        createdAt: new Date()
      },
      {
        id: 'family_support',
        name: 'Increased Family Support',
        description: 'Additional GHS 500 monthly support to extended family',
        type: 'expense_change',
        parameters: {
          recurringExpense: {
            amount: 500,
            frequency: 'monthly'
          }
        },
        duration: 180,
        createdAt: new Date()
      },
      {
        id: 'rent_increase',
        name: 'Rent Increase',
        description: 'Landlord increases rent by 30%',
        type: 'expense_change',
        parameters: {
          recurringExpense: {
            amount: 0, // Will be calculated based on current rent
            frequency: 'monthly'
          },
          expenseChange: 30
        },
        duration: 365,
        createdAt: new Date()
      }
    ];
  }

  private static generateBaselineProjection(
    accounts: IAccount[],
    transactions: ITransaction[],
    days: number
  ): BaselineProjection {
    const currentBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    const dailyProjections: DailyProjection[] = [];
    
    // Analyze recent income/expense patterns
    const recentTransactions = transactions.filter(t => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);
      return new Date(t.date) >= cutoffDate;
    });

    const avgDailyIncome = this.calculateAverageDailyIncome(recentTransactions);
    const avgDailyExpenses = this.calculateAverageDailyExpenses(recentTransactions);

    let runningBalance = currentBalance;
    let totalIncome = 0;
    let totalExpenses = 0;
    let cashFlowIssues = 0;

    for (let i = 0; i < days; i++) {
      const currentDate = new Date();
      currentDate.setDate(currentDate.getDate() + i);

      // Apply some randomness to make it realistic
      const incomeVariation = 0.8 + Math.random() * 0.4; // ±20% variation
      const expenseVariation = 0.8 + Math.random() * 0.4;

      const dailyIncome = avgDailyIncome * incomeVariation;
      const dailyExpenses = avgDailyExpenses * expenseVariation;
      const netCashFlow = dailyIncome - dailyExpenses;

      runningBalance += netCashFlow;
      totalIncome += dailyIncome;
      totalExpenses += dailyExpenses;

      if (runningBalance < 0) {
        cashFlowIssues++;
      }

      dailyProjections.push({
        date: currentDate.toISOString().split('T')[0],
        balance: runningBalance,
        income: dailyIncome,
        expenses: dailyExpenses,
        netCashFlow
      });
    }

    return {
      dailyProjections,
      finalBalance: runningBalance,
      totalIncome,
      totalExpenses,
      cashFlowIssues
    };
  }

  private static generateStressedProjection(
    scenario: Scenario,
    accounts: IAccount[],
    transactions: ITransaction[],
    days: number
  ): StressedProjection {
    const currentBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    const dailyProjections: DailyProjection[] = [];
    
    const recentTransactions = transactions.filter(t => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);
      return new Date(t.date) >= cutoffDate;
    });

    const avgDailyIncome = this.calculateAverageDailyIncome(recentTransactions);
    const avgDailyExpenses = this.calculateAverageDailyExpenses(recentTransactions);

    let runningBalance = currentBalance;
    let totalIncome = 0;
    let totalExpenses = 0;
    let cashFlowIssues = 0;
    let lowestBalance = currentBalance;
    let negativeDays = 0;

    for (let i = 0; i < days; i++) {
      const currentDate = new Date();
      currentDate.setDate(currentDate.getDate() + i);

      // Apply scenario parameters
      let dailyIncome = avgDailyIncome;
      let dailyExpenses = avgDailyExpenses;

      // Income changes
      if (scenario.parameters.incomeChange) {
        dailyIncome *= (1 + scenario.parameters.incomeChange / 100);
      }

      // Expense changes
      if (scenario.parameters.expenseChange) {
        dailyExpenses *= (1 + scenario.parameters.expenseChange / 100);
      }

      // Currency depreciation effects
      if (scenario.parameters.currencyDepreciation) {
        dailyExpenses *= (1 + scenario.parameters.currencyDepreciation / 100 * 0.3); // Partial pass-through
      }

      // Inflation effects
      if (scenario.parameters.inflationRate) {
        dailyExpenses *= (1 + scenario.parameters.inflationRate / 100 * 0.5); // Partial pass-through
      }

      // One-time events
      if (scenario.parameters.oneTimeIncome && i === 0) {
        dailyIncome += scenario.parameters.oneTimeIncome;
      }
      if (scenario.parameters.oneTimeExpense && i === 0) {
        dailyExpenses += scenario.parameters.oneTimeExpense;
      }

      // Recurring events
      if (scenario.parameters.recurringIncome) {
        const frequency = scenario.parameters.recurringIncome.frequency;
        const shouldApply = this.shouldApplyRecurring(i, frequency);
        if (shouldApply) {
          dailyIncome += scenario.parameters.recurringIncome.amount;
        }
      }

      if (scenario.parameters.recurringExpense) {
        const frequency = scenario.parameters.recurringExpense.frequency;
        const shouldApply = this.shouldApplyRecurring(i, frequency);
        if (shouldApply) {
          dailyExpenses += scenario.parameters.recurringExpense.amount;
        }
      }

      // Add some randomness
      const incomeVariation = 0.8 + Math.random() * 0.4;
      const expenseVariation = 0.8 + Math.random() * 0.4;

      dailyIncome *= incomeVariation;
      dailyExpenses *= expenseVariation;

      const netCashFlow = dailyIncome - dailyExpenses;
      runningBalance += netCashFlow;
      totalIncome += dailyIncome;
      totalExpenses += dailyExpenses;

      if (runningBalance < 0) {
        cashFlowIssues++;
        negativeDays++;
      }

      if (runningBalance < lowestBalance) {
        lowestBalance = runningBalance;
      }

      dailyProjections.push({
        date: currentDate.toISOString().split('T')[0],
        balance: runningBalance,
        income: dailyIncome,
        expenses: dailyExpenses,
        netCashFlow
      });
    }

    return {
      dailyProjections,
      finalBalance: runningBalance,
      totalIncome,
      totalExpenses,
      cashFlowIssues,
      lowestBalance,
      negativeDays
    };
  }

  private static analyzeImpact(baseline: BaselineProjection, stressed: StressedProjection): ImpactAnalysis {
    const balanceImpact = stressed.finalBalance - baseline.finalBalance;
    const incomeImpact = stressed.totalIncome - baseline.totalIncome;
    const expenseImpact = stressed.totalExpenses - baseline.totalExpenses;

    // Calculate volatility
    const baselineCashFlows = baseline.dailyProjections.map(d => d.netCashFlow);
    const stressedCashFlows = stressed.dailyProjections.map(d => d.netCashFlow);
    
    const baselineVolatility = this.calculateVolatility(baselineCashFlows);
    const stressedVolatility = this.calculateVolatility(stressedCashFlows);
    const cashFlowVolatility = stressedVolatility - baselineVolatility;

    // Risk metrics
    const liquidityRisk = Math.abs(balanceImpact) / baseline.finalBalance;
    const solvencyRisk = stressed.negativeDays / stressed.dailyProjections.length;

    return {
      balanceImpact,
      incomeImpact,
      expenseImpact,
      cashFlowVolatility,
      liquidityRisk,
      solvencyRisk
    };
  }

  private static generateRecommendations(impact: ImpactAnalysis, scenario: Scenario): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // High balance impact
    if (Math.abs(impact.balanceImpact) > 0.3 * Math.abs(impact.balanceImpact + 1000)) {
      recommendations.push({
        type: 'build_emergency_fund',
        priority: 'high',
        description: 'Build emergency fund covering 3-6 months of expenses',
        potentialImpact: Math.abs(impact.balanceImpact) * 0.5,
        feasibility: 'moderate'
      });
    }

    // Income reduction scenarios
    if (scenario.parameters.incomeChange && scenario.parameters.incomeChange < -20) {
      recommendations.push({
        type: 'diversify_income',
        priority: 'high',
        description: 'Develop multiple income streams to reduce dependency',
        potentialImpact: Math.abs(impact.incomeImpact) * 0.3,
        feasibility: 'challenging'
      });

      recommendations.push({
        type: 'reduce_expenses',
        priority: 'medium',
        description: 'Cut non-essential expenses by 20-30%',
        potentialImpact: Math.abs(impact.expenseImpact) * 0.4,
        feasibility: 'easy'
      });
    }

    // Currency depreciation scenarios
    if (scenario.parameters.currencyDepreciation && scenario.parameters.currencyDepreciation > 10) {
      recommendations.push({
        type: 'hedge_currency',
        priority: 'medium',
        description: 'Consider holding some savings in stable foreign currency',
        potentialImpact: impact.balanceImpact * 0.2,
        feasibility: 'moderate'
      });
    }

    // High liquidity risk
    if (impact.liquidityRisk > 0.5) {
      recommendations.push({
        type: 'increase_income',
        priority: 'high',
        description: 'Seek additional income sources or negotiate better rates',
        potentialImpact: impact.balanceImpact * 0.6,
        feasibility: 'moderate'
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private static assessRiskLevel(impact: ImpactAnalysis, stressed: StressedProjection): 'low' | 'medium' | 'high' | 'critical' {
    let riskScore = 0;

    // Balance impact (0-30 points)
    const balanceImpactPercent = Math.abs(impact.balanceImpact) / Math.abs(stressed.finalBalance + 1000);
    riskScore += Math.min(balanceImpactPercent * 100, 30);

    // Solvency risk (0-40 points)
    riskScore += impact.solvencyRisk * 40;

    // Liquidity risk (0-30 points)
    riskScore += Math.min(impact.liquidityRisk * 100, 30);

    if (riskScore >= 70) return 'critical';
    if (riskScore >= 50) return 'high';
    if (riskScore >= 30) return 'medium';
    return 'low';
  }

  private static calculateAverageDailyIncome(transactions: ITransaction[]): number {
    const incomeTransactions = transactions.filter(t => t.type === 'income');
    if (incomeTransactions.length === 0) return 0;
    
    const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
    const daysSpanned = this.calculateDaysSpanned(transactions);
    
    return totalIncome / Math.max(daysSpanned, 1);
  }

  private static calculateAverageDailyExpenses(transactions: ITransaction[]): number {
    const expenseTransactions = transactions.filter(t => t.type === 'expense');
    if (expenseTransactions.length === 0) return 0;
    
    const totalExpenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
    const daysSpanned = this.calculateDaysSpanned(transactions);
    
    return totalExpenses / Math.max(daysSpanned, 1);
  }

  private static calculateDaysSpanned(transactions: ITransaction[]): number {
    if (transactions.length === 0) return 1;
    
    const dates = transactions.map(t => new Date(t.date));
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    const daysDiff = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(daysDiff, 1);
  }

  private static shouldApplyRecurring(dayIndex: number, frequency: 'daily' | 'weekly' | 'monthly'): boolean {
    switch (frequency) {
      case 'daily':
        return true;
      case 'weekly':
        return dayIndex % 7 === 0;
      case 'monthly':
        return dayIndex % 30 === 0;
      default:
        return false;
    }
  }

  private static calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }
}
