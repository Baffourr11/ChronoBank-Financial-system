// Path: app/api/datasets/route.ts
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api";
import { Dataset, Transaction, Account } from "@/lib/models";
import mongoose from "mongoose";
import * as XLSX from "xlsx";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("includeInactive") === "true";

    const query: any = { userId: user.userId };
    // By default, return all datasets (both active and inactive)
    // Only filter to active-only if includeInactive=false is explicitly set
    if (searchParams.get("includeInactive") === "false") {
      query.isActive = true;
    }

    const datasets = await Dataset.find(query)
      .sort({ createdAt: -1 })
      .select(
        "name description transactionCount dateRange isActive metadata createdAt updatedAt",
      );

    return apiSuccess({
      datasets: datasets.map((dataset) => ({
        _id: dataset._id.toString(),
        name: dataset.name,
        description: dataset.description,
        transactionCount: dataset.transactionCount,
        dateRange: {
          start: dataset.dateRange.start,
          end: dataset.dateRange.end,
          totalDays: Math.ceil(
            (new Date(dataset.dateRange.end).getTime() -
              new Date(dataset.dateRange.start).getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        },
        isActive: dataset.isActive,
        metadata: dataset.metadata,
        createdAt: dataset.createdAt,
        updatedAt: dataset.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Get datasets error:", error);
    return apiError("Failed to fetch datasets", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    await connectToDatabase();

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const datasetName = formData.get("name") as string;
    const description = formData.get("description") as string;

    if (!file) {
      return apiError("No file provided", 400);
    }

    if (!datasetName) {
      return apiError("Dataset name is required", 400);
    }

    // Check file type
    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(fileExtension || "")) {
      return apiError(
        "Only Excel (.xlsx, .xls) and CSV files are supported",
        400,
      );
    }

    // Read file content
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let transactions: any[] = [];

    try {
      if (fileExtension === "csv") {
        // Parse CSV
        const text = buffer.toString("utf-8");
        const lines = text.split("\n").filter((line) => line.trim());
        const headers = lines[0]?.split(",").map((h) => h.trim());

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map((v) => v.trim());
          if (values.length >= 4) {
            transactions.push({
              date: values[0],
              type: values[1],
              category: values[2],
              amount: parseFloat(values[3]) || 0,
              description: values[4] || "",
              accountName: values[5] || "Main Account",
            });
          }
        }
      } else {
        // Parse Excel
        const workbook = XLSX.read(buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        transactions = jsonData.map((row: any) => ({
          date: row.Date || row.date || "",
          type: row.Type || row.type || "expense",
          category: row.Category || row.category || "",
          amount: parseFloat(row.Amount || row.amount) || 0,
          description: row.Description || row.description || "",
          accountName: row.Account || row.accountName || "Main Account",
        }));
      }
    } catch (parseError) {
      console.error("File parsing error:", parseError);
      return apiError("Failed to parse file. Please check the format.", 400);
    }

    if (transactions.length === 0) {
      return apiError("No valid transactions found in file", 400);
    }

    // Find date range
    const dates = transactions
      .map((tx) => new Date(tx.date))
      .filter((date) => !isNaN(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    const dateRange = {
      start: dates[0] || new Date(),
      end: dates[dates.length - 1] || new Date(),
    };

    // Create dataset record FIRST (before transactions)
    const dataset = await Dataset.create({
      userId: user.userId,
      name: datasetName,
      description,
      transactionCount: 0, // Will update after processing
      dateRange,
      isActive: true,
      metadata: {
        source: "upload",
        format: fileExtension,
        importedAt: new Date(),
      },
    });

    const datasetId = dataset._id;

    // Get user's accounts for mapping
    const accounts = await Account.find({ userId: user.userId });
    const accountMap = new Map();
    accounts.forEach((acc) => {
      accountMap.set(acc.name.toLowerCase(), acc._id);
    });

    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];
    const createdAccountIds: mongoose.Types.ObjectId[] = [];

    // Process transactions
    for (const tx of transactions) {
      try {
        // Validate transaction
        const validationResult = validateTransaction(tx);
        if (!validationResult.valid) {
          errors.push(validationResult.error || "Invalid transaction");
          skippedCount++;
          continue;
        }

        // Map account name to account ID - create account if doesn't exist
        let accountId = null;
        if (tx.accountName) {
          accountId = accountMap.get(tx.accountName.toLowerCase());

          // Create account if it doesn't exist
          if (!accountId) {
            const newAccount = await Account.create({
              userId: user.userId,
              datasetId: datasetId,
              name: tx.accountName,
              type: "checking",
              balance: 0,
              currency: "GHS",
            });
            accountId = newAccount._id;
            accountMap.set(tx.accountName.toLowerCase(), accountId);
            createdAccountIds.push(accountId);
          }
        }

        // Create transaction with datasetId
        await Transaction.create({
          userId: user.userId,
          datasetId: datasetId,
          accountId: accountId || accounts[0]?._id,
          type: tx.type,
          category: tx.category,
          amount: tx.amount,
          description: tx.description || `${tx.type} in ${tx.category}`,
          date: new Date(tx.date),
          tags: [],
          status: "completed",
        });

        importedCount++;
      } catch (error) {
        errors.push(
          `Transaction: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
        skippedCount++;
      }
    }

    // Update dataset with actual transaction count
    await Dataset.findByIdAndUpdate(datasetId, {
      transactionCount: importedCount,
    });

    return apiSuccess(
      {
        dataset: {
          id: dataset._id.toString(),
          name: dataset.name,
          description: dataset.description,
          transactionCount: importedCount,
          dateRange: dataset.dateRange,
          metadata: dataset.metadata,
        },
        importResult: {
          total: transactions.length,
          imported: importedCount,
          skipped: skippedCount,
          errors,
        },
      },
      201,
    );
  } catch (error) {
    console.error("Dataset upload error:", error);
    return apiError("Failed to upload dataset", 500);
  }
}

function validateTransaction(tx: any): { valid: boolean; error?: string } {
  if (!tx.date) {
    return { valid: false, error: "Date is required" };
  }

  if (!tx.type || !["income", "expense", "transfer"].includes(tx.type)) {
    return {
      valid: false,
      error: "Type must be 'income', 'expense', or 'transfer'",
    };
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

  return { valid: true };
}
