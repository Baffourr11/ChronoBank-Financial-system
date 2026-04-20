// Path: lib/data/sampleDataGenerator.ts
import { ITransaction } from "../models/Transaction";
import { IAccount } from "../models/Account";
import { ANALYTICS_CONFIG } from "../analytics/config";

interface SampleDataOptions {
  monthsOfHistory: number;
  accountsCount: number;
  irregularIncome: boolean;
  includeSeasonalPatterns: boolean;
  baseIncome: number;
  varianceLevel: "low" | "medium" | "high";
}

export class SampleDataGenerator {
  static generateHistoricalData(options: Partial<SampleDataOptions> = {}): {
    accounts: any[];
    transactions: any[];
  } {
    const config: SampleDataOptions = {
      monthsOfHistory: 12,
      accountsCount: 3,
      irregularIncome: true,
      includeSeasonalPatterns: true,
      baseIncome: 3000,
      varianceLevel: "medium",
      ...options,
    };

    const accounts = this.generateAccounts(config);
    const transactions = this.generateTransactions(accounts, config);

    return { accounts, transactions };
  }

  private static generateAccounts(config: SampleDataOptions): any[] {
    const accountTypes = ["checking", "savings", "business"];
    const accountNames = [
      "Main Account",
      "Savings Account",
      "Business Account",
    ];

    return Array.from({ length: config.accountsCount }, (_, index) => ({
      _id: `account_${index}`,
      userId: "sample_user",
      name: accountNames[index] || `Account ${index + 1}`,
      type: accountTypes[index] || "checking",
      balance: this.getRandomBalance(config.baseIncome),
      currency: "GHS",
      createdAt: new Date(
        Date.now() - config.monthsOfHistory * 30 * 24 * 60 * 60 * 1000,
      ),
    }));
  }

  private static generateTransactions(
    accounts: any[],
    config: SampleDataOptions,
  ): any[] {
    const transactions: any[] = [];
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - config.monthsOfHistory);
    const endDate = new Date();

    // Generate daily transactions
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayTransactions = this.generateDailyTransactions(
        currentDate,
        accounts,
        config,
      );
      transactions.push(...dayTransactions);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return transactions.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  }

  private static generateDailyTransactions(
    date: Date,
    accounts: any[],
    config: SampleDataOptions,
  ): any[] {
    const transactions: any[] = [];
    const dayOfWeek = date.getDay();
    const dayOfMonth = date.getDate();
    const month = date.getMonth();

    // Income transactions (irregular for informal sector)
    if (this.shouldGenerateIncome(date, config)) {
      const incomeAmount = this.calculateIncomeAmount(date, config);
      transactions.push(
        this.createTransaction(
          date,
          accounts[0],
          "income",
          "Salary/Business",
          incomeAmount,
          "Monthly income",
        ),
      );
    }

    // Daily expenses
    const dailyExpenses = this.generateDailyExpenses(date, config);
    dailyExpenses.forEach((expense) => {
      transactions.push(
        this.createTransaction(
          date,
          accounts[0],
          expense.type as "income" | "expense" | "transfer",
          expense.category,
          expense.amount,
          expense.description,
        ),
      );
    });

    // Weekly expenses (transport, market)
    if (dayOfWeek === 5 || dayOfWeek === 6) {
      // Friday/Saturday
      transactions.push(
        this.createTransaction(
          date,
          accounts[0],
          "expense",
          "Transportation",
          15 + Math.random() * 25,
          "Weekend transport",
        ),
      );
      transactions.push(
        this.createTransaction(
          date,
          accounts[0],
          "expense",
          "Food",
          50 + Math.random() * 100,
          "Weekend market shopping",
        ),
      );
    }

    // Monthly expenses (rent, utilities)
    if (dayOfMonth === 1 || dayOfMonth === 5) {
      transactions.push(
        this.createTransaction(
          date,
          accounts[0],
          "expense",
          "Rent",
          800 + Math.random() * 400,
          "Monthly rent",
        ),
      );
      transactions.push(
        this.createTransaction(
          date,
          accounts[0],
          "expense",
          "Utilities",
          100 + Math.random() * 50,
          "Utilities (electricity, water)",
        ),
      );
    }

    // Seasonal patterns
    if (config.includeSeasonalPatterns) {
      const seasonalTransactions = this.generateSeasonalTransactions(
        date,
        accounts,
        config,
      );
      transactions.push(...seasonalTransactions);
    }

    // Ghanaian-specific patterns
    const ghanaianTransactions = this.generateGhanaianTransactions(
      date,
      accounts,
      config,
    );
    transactions.push(...ghanaianTransactions);

    return transactions;
  }

  private static shouldGenerateIncome(
    date: Date,
    config: SampleDataOptions,
  ): boolean {
    if (!config.irregularIncome) {
      // Regular income - same day each month
      return date.getDate() === 25 || date.getDate() === 30;
    }

    // Irregular income - more realistic for informal sector
    const dayOfMonth = date.getDate();
    const month = date.getMonth();

    // Higher probability around payday (25th-5th)
    if (
      (dayOfMonth >= 25 && dayOfMonth <= 31) ||
      (dayOfMonth >= 1 && dayOfMonth <= 5)
    ) {
      return Math.random() < 0.6; // 60% chance during payday period
    }

    // Lower probability other times
    return Math.random() < 0.1; // 10% chance other times
  }

  private static calculateIncomeAmount(
    date: Date,
    config: SampleDataOptions,
  ): number {
    const baseAmount = config.baseIncome;
    const variance = this.getVarianceMultiplier(config.varianceLevel);

    let amount = baseAmount * variance;

    // Seasonal adjustments
    const month = date.getMonth();
    if (month === 11) amount *= 1.2; // December bonus season
    if (month === 3) amount *= 0.8; // Easter slowdown

    // Add some randomness
    amount *= 0.8 + Math.random() * 0.4;

    return Math.round(amount);
  }

  private static generateDailyExpenses(
    date: Date,
    config: SampleDataOptions,
  ): Array<{
    category: string;
    type: string;
    amount: number;
    description: string;
  }> {
    const expenses = [];
    const variance = this.getVarianceMultiplier(config.varianceLevel);

    // Food (daily)
    expenses.push({
      category: "Food",
      type: "expense",
      amount: Math.round((20 + Math.random() * 30) * variance),
      description: "Daily meals and groceries",
    });

    // Transportation (most weekdays)
    if (date.getDay() >= 1 && date.getDay() <= 5) {
      expenses.push({
        category: "Transportation",
        type: "expense",
        amount: Math.round((10 + Math.random() * 20) * variance),
        description: "Daily transport to work/business",
      });
    }

    return expenses;
  }

  private static generateSeasonalTransactions(
    date: Date,
    accounts: any[],
    config: SampleDataOptions,
  ): any[] {
    const transactions: ITransaction[] = [];
    const month = date.getMonth();
    const dayOfMonth = date.getDate();

    // December Christmas spending
    if (month === 11 && dayOfMonth >= 15) {
      transactions.push(
        this.createTransaction(
          date,
          accounts[0],
          "expense",
          "Gifts",
          200 + Math.random() * 300,
          "Christmas shopping",
        ),
      );
      transactions.push(
        this.createTransaction(
          date,
          accounts[0],
          "expense",
          "Food",
          100 + Math.random() * 200,
          "Christmas food and celebration",
        ),
      );
    }

    // April Easter
    if (month === 3 && dayOfMonth >= 10 && dayOfMonth <= 15) {
      transactions.push(
        this.createTransaction(
          date,
          accounts[0],
          "expense",
          "Food",
          80 + Math.random() * 120,
          "Easter celebration",
        ),
      );
    }

    // August Homowo (Ghanaian harvest festival)
    if (month === 7 && dayOfMonth >= 20 && dayOfMonth <= 25) {
      transactions.push(
        this.createTransaction(
          date,
          accounts[0],
          "expense",
          "Food",
          150 + Math.random() * 250,
          "Homowo festival celebration",
        ),
      );
      transactions.push(
        this.createTransaction(
          date,
          accounts[0],
          "expense",
          "Family Support",
          100 + Math.random() * 200,
          "Family support during festival",
        ),
      );
    }

    return transactions;
  }

  private static generateGhanaianTransactions(
    date: Date,
    accounts: IAccount[],
    config: SampleDataOptions,
  ): ITransaction[] {
    const transactions: ITransaction[] = [];
    const dayOfMonth = date.getDate();
    const dayOfWeek = date.getDay();

    // Payday period spending (25th-5th)
    if (
      (dayOfMonth >= 25 && dayOfMonth <= 31) ||
      (dayOfMonth >= 1 && dayOfMonth <= 5)
    ) {
      if (Math.random() < 0.3) {
        transactions.push(
          this.createTransaction(
            date,
            accounts[0],
            "expense",
            "Family Support",
            50 + Math.random() * 150,
            "Family support after payday",
          ),
        );
      }
      if (Math.random() < 0.2) {
        transactions.push(
          this.createTransaction(
            date,
            accounts[0],
            "expense",
            "Entertainment",
            30 + Math.random() * 70,
            "Weekend entertainment",
          ),
        );
      }
    }

    // Weekend market shopping (Saturday/Sunday)
    if (dayOfWeek === 6 || dayOfWeek === 0) {
      if (Math.random() < 0.4) {
        transactions.push(
          this.createTransaction(
            date,
            accounts[0],
            "expense",
            "Household",
            40 + Math.random() * 60,
            "Weekly market shopping",
          ),
        );
      }
    }

    // School fees (beginning of term)
    if (
      dayOfMonth >= 1 &&
      dayOfMonth <= 10 &&
      [0, 8, 0].includes(date.getMonth())
    ) {
      // Jan, Sep, Jan
      if (Math.random() < 0.5) {
        transactions.push(
          this.createTransaction(
            date,
            accounts[0],
            "expense",
            "Education",
            200 + Math.random() * 400,
            "School fees and supplies",
          ),
        );
      }
    }

    return transactions;
  }

  private static createTransaction(
    date: Date,
    account: any,
    type: "income" | "expense" | "transfer",
    category: string,
    amount: number,
    description: string,
  ): any {
    return {
      _id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: "sample_user",
      accountId: account._id,
      type,
      category,
      amount: Math.round(amount),
      description,
      date: new Date(date),
      isRecurring: false,
      status: "completed",
      tags: [],
      createdAt: new Date(),
    } as ITransaction;
  }

  private static getRandomBalance(baseIncome: number): number {
    return Math.round(baseIncome * (0.5 + Math.random() * 2));
  }

  private static getVarianceMultiplier(
    level: "low" | "medium" | "high",
  ): number {
    switch (level) {
      case "low":
        return 0.9 + Math.random() * 0.2; // 0.9-1.1
      case "medium":
        return 0.7 + Math.random() * 0.6; // 0.7-1.3
      case "high":
        return 0.5 + Math.random() * 1.0; // 0.5-1.5
      default:
        return 1;
    }
  }

  // Utility method to generate CSV import data
  static generateCSVData(options: Partial<SampleDataOptions> = {}): string {
    const { transactions } = this.generateHistoricalData(options);

    const headers = [
      "date",
      "type",
      "category",
      "amount",
      "description",
      "accountName",
    ];
    const csvRows = [headers.join(",")];

    transactions.forEach((tx) => {
      const row = [
        tx.date.toISOString().split("T")[0],
        tx.type,
        tx.category,
        tx.amount.toString(),
        `"${tx.description}"`,
        "Main Account",
      ];
      csvRows.push(row.join(","));
    });

    return csvRows.join("\n");
  }

  // Generate JSON import data
  static generateJSONData(options: Partial<SampleDataOptions> = {}): any[] {
    const { transactions } = this.generateHistoricalData(options);

    return transactions.map((tx) => ({
      date: tx.date.toISOString().split("T")[0],
      type: tx.type,
      category: tx.category,
      amount: tx.amount,
      description: tx.description,
      accountName: "Main Account",
      tags: tx.tags,
    }));
  }
}
