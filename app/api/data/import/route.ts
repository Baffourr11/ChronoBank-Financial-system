import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api";
import { Transaction, Account } from "@/lib/models";
import { ANALYTICS_CONFIG } from "@/lib/analytics/config";

interface ImportTransaction {
  date: string;
  type: 'income' | 'expense' | 'transfer';
  category: string;
  amount: number;
  description?: string;
  accountName?: string;
  tags?: string[];
}

interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  errors: string[];
  accounts: string[];
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    const body = await request.json();
    const { transactions, options = {} } = body;

    if (!Array.isArray(transactions)) {
      return apiError("Transactions must be an array", 400);
    }

    await connectToDatabase();

    // Get user's accounts for mapping
    const accounts = await Account.find({ userId: user.userId });
    const accountMap = new Map();
    accounts.forEach(acc => {
      accountMap.set(acc.name.toLowerCase(), acc._id);
    });

    const result: ImportResult = {
      total: transactions.length,
      imported: 0,
      skipped: 0,
      errors: [],
      accounts: []
    };

    // Process transactions in batches
    const batchSize = options.batchSize || 100;
    
    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);
      
      for (const tx of batch) {
        try {
          // Validate transaction
          const validationResult = validateTransaction(tx);
          if (!validationResult.valid) {
            result.errors.push(`Transaction ${i + 1}: ${validationResult.error}`);
            result.skipped++;
            continue;
          }

          // Map account name to account ID
          let accountId = null;
          if (tx.accountName) {
            accountId = accountMap.get(tx.accountName.toLowerCase());
            if (!accountId && options.createMissingAccounts) {
              // Create new account if option is enabled
              const newAccount = await Account.create({
                userId: user.userId,
                name: tx.accountName,
                type: 'checking',
                balance: 0,
                currency: 'GHS'
              });
              accountId = newAccount._id;
              accountMap.set(tx.accountName.toLowerCase(), accountId);
              result.accounts.push(tx.accountName);
            }
          }

          // Check for duplicates
          if (options.skipDuplicates) {
            const existingTx = await Transaction.findOne({
              userId: user.userId,
              date: new Date(tx.date),
              type: tx.type,
              category: tx.category,
              amount: tx.amount,
              description: tx.description || ''
            });

            if (existingTx) {
              result.skipped++;
              continue;
            }
          }

          // Create transaction
          await Transaction.create({
            userId: user.userId,
            accountId: accountId || accounts[0]?._id, // Use first account if none specified
            type: tx.type,
            category: tx.category,
            amount: tx.amount,
            description: tx.description || `${tx.type} in ${tx.category}`,
            date: new Date(tx.date),
            tags: tx.tags || [],
            status: 'completed'
          });

          result.imported++;
        } catch (error) {
          result.errors.push(`Transaction ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          result.skipped++;
        }
      }
    }

    return apiSuccess({
      ...result,
      message: `Imported ${result.imported} of ${result.total} transactions`
    });
  } catch (error) {
    console.error("Import error:", error);
    return apiError("Failed to import transactions", 500);
  }
}

function validateTransaction(tx: ImportTransaction): { valid: boolean; error?: string } {
  if (!tx.date) {
    return { valid: false, error: "Date is required" };
  }

  if (!tx.type || !['income', 'expense', 'transfer'].includes(tx.type)) {
    return { valid: false, error: "Type must be 'income', 'expense', or 'transfer'" };
  }

  if (!tx.category || tx.category.trim().length === 0) {
    return { valid: false, error: "Category is required" };
  }

  if (!tx.amount || tx.amount <= 0) {
    return { valid: false, error: "Amount must be greater than 0" };
  }

  const date = new Date(tx.date);
  if (isNaN(date.getTime())) {
    return { valid: false, error: "Invalid date format" };
  }

  // Check if date is not too far in the future
  const maxFutureDate = new Date();
  maxFutureDate.setDate(maxFutureDate.getDate() + 30);
  if (date > maxFutureDate) {
    return { valid: false, error: "Date cannot be more than 30 days in the future" };
  }

  // Check if date is not too far in the past (for historical analysis)
  const minPastDate = new Date();
  minPastDate.setFullYear(minPastDate.getFullYear() - 5);
  if (date < minPastDate) {
    return { valid: false, error: "Date cannot be more than 5 years in the past" };
  }

  return { valid: true };
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    await connectToDatabase();

    // Get import statistics
    const totalTransactions = await Transaction.countDocuments({ userId: user.userId });
    const oldestTransaction = await Transaction.findOne({ userId: user.userId }).sort({ date: 1 });
    const newestTransaction = await Transaction.findOne({ userId: user.userId }).sort({ date: -1 });

    const dataRange = {
      start: oldestTransaction?.date,
      end: newestTransaction?.date,
      totalDays: oldestTransaction && newestTransaction 
        ? Math.ceil((new Date(newestTransaction.date).getTime() - new Date(oldestTransaction.date).getTime()) / (1000 * 60 * 60 * 24))
        : 0
    };

    // Check if we have enough data for pattern detection
    const hasEnoughData = totalTransactions >= ANALYTICS_CONFIG.PATTERN_DETECTION.MIN_DATA_POINTS;
    const hasHistoricalData = dataRange.totalDays >= 90; // At least 3 months

    return apiSuccess({
      statistics: {
        totalTransactions,
        dataRange,
        hasEnoughData,
        hasHistoricalData
      },
      recommendations: {
        needsMoreData: totalTransactions < ANALYTICS_CONFIG.PATTERN_DETECTION.MIN_DATA_POINTS,
        recommendedMinTransactions: ANALYTICS_CONFIG.PATTERN_DETECTION.MIN_DATA_POINTS,
        needsLongerHistory: dataRange.totalDays < 90,
        recommendedMinDays: 90
      }
    });
  } catch (error) {
    console.error("Import stats error:", error);
    return apiError("Failed to get import statistics", 500);
  }
}
