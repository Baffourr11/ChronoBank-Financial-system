// Path: app/api/data/sample/route.ts
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api";
import { Transaction, Account, Dataset } from "@/lib/models";
import { SampleDataGenerator } from "@/lib/data/sampleDataGenerator";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    const body = await request.json();
    const { options = {}, generateAccounts = true } = body;

    await connectToDatabase();

    // Generate sample data
    const sampleData = SampleDataGenerator.generateHistoricalData(options);

    // Create dataset record FIRST
    const transactions = sampleData.transactions;
    const dates = transactions.map((tx) => new Date(tx.date));
    const dateRange = {
      start: dates[0] || new Date(),
      end: dates[dates.length - 1] || new Date(),
    };

    const dataset = await Dataset.create({
      userId: user.userId,
      name: `Sample Data ${new Date().toLocaleDateString()}`,
      description: `Generated sample data with ${options.monthsOfHistory} months of history`,
      transactionCount: 0, // Will update after processing
      dateRange,
      isActive: true,
      metadata: {
        source: "sample",
        format: "json",
        importedAt: new Date(),
      },
    });

    const datasetId = dataset._id;

    let createdAccounts = [];

    if (generateAccounts) {
      // Create accounts first with datasetId
      for (const accountData of sampleData.accounts) {
        const account = await Account.create({
          userId: user.userId,
          datasetId: datasetId,
          name: accountData.name,
          type: accountData.type,
          balance: accountData.balance,
          currency: accountData.currency,
        });
        createdAccounts.push(account);
      }
    } else {
      // Use existing accounts - update them with datasetId
      const existingAccounts = await Account.find({ userId: user.userId });
      for (const account of existingAccounts) {
        account.datasetId = datasetId;
        await account.save();
        createdAccounts.push(account);
      }
    }

    // Create transactions
    let createdTransactions = 0;
    let skippedTransactions = 0;
    const errors: string[] = [];

    for (const [index, transactionData] of sampleData.transactions.entries()) {
      try {
        // Map to real account ID
        const accountIndex = Math.min(
          index % createdAccounts.length,
          createdAccounts.length - 1,
        );
        const accountId = createdAccounts[accountIndex]._id;

        // Check for duplicates
        const existingTx = await Transaction.findOne({
          userId: user.userId,
          date: transactionData.date,
          type: transactionData.type,
          category: transactionData.category,
          amount: transactionData.amount,
          description: transactionData.description,
        });

        if (existingTx) {
          skippedTransactions++;
          continue;
        }

        await Transaction.create({
          userId: user.userId,
          datasetId: datasetId,
          accountId: accountId,
          type: transactionData.type,
          category: transactionData.category,
          amount: transactionData.amount,
          description: transactionData.description,
          date: transactionData.date,
          isRecurring: transactionData.isRecurring,
          status: transactionData.status,
          tags: transactionData.tags || [],
        });

        createdTransactions++;
      } catch (error) {
        errors.push(
          `Transaction ${index + 1}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
        skippedTransactions++;
      }
    }

    // Update dataset with actual transaction count
    await Dataset.findByIdAndUpdate(datasetId, {
      transactionCount: createdTransactions,
    });

    return apiSuccess({
      created: {
        accounts: createdAccounts.length,
        transactions: createdTransactions,
      },
      skipped: {
        transactions: skippedTransactions,
      },
      errors: errors.slice(0, 10), // Limit errors to prevent huge responses
      dataRange: {
        start: sampleData.transactions[0]?.date,
        end: sampleData.transactions[sampleData.transactions.length - 1]?.date,
        totalTransactions: sampleData.transactions.length,
      },
      dataset: {
        id: dataset._id.toString(),
        name: dataset.name,
        transactionCount: createdTransactions,
      },
      message: `Successfully created ${createdAccounts.length} accounts and ${createdTransactions} transactions`,
    });
  } catch (error) {
    console.error("Sample data generation error:", error);
    return apiError("Failed to generate sample data", 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "json";
    const options = {
      monthsOfHistory: parseInt(searchParams.get("months") || "12"),
      accountsCount: parseInt(searchParams.get("accounts") || "3"),
      irregularIncome: searchParams.get("irregular") !== "false",
      includeSeasonalPatterns: searchParams.get("seasonal") !== "false",
      baseIncome: parseFloat(searchParams.get("income") || "3000"),
      varianceLevel: (searchParams.get("variance") || "medium") as
        | "low"
        | "medium"
        | "high",
    };

    let data;
    let contentType = "application/json";

    if (format === "csv") {
      data = SampleDataGenerator.generateCSVData(options);
      contentType = "text/csv";
    } else if (format === "json") {
      data = JSON.stringify(SampleDataGenerator.generateJSONData(options));
      contentType = "application/json";
    } else {
      return apiError("Invalid format. Use 'json' or 'csv'", 400);
    }

    // Return the data with appropriate content type
    return new Response(data as string, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="sample-data.${format}"`,
      },
    });
  } catch (error) {
    console.error("Sample data export error:", error);
    return apiError("Failed to export sample data", 500);
  }
}
