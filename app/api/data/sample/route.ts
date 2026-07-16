import { NextRequest } from "next/server";

import { getAuthenticatedContext } from "@/lib/api/helpers";

import { apiSuccess, apiError } from "@/lib/api";

import { SampleDataGenerator } from "@/lib/data/sampleDataGenerator";

import { runIntelligencePipeline } from "@/lib/intelligence/pipeline";
import { activateDatasetForUser } from "@/lib/data/importDatasetTransactions";
import { repairDatasetAccounts } from "@/lib/data/repairDatasetAccounts";

import type { AccountRow } from "@/lib/supabase/types";



const INSERT_CHUNK_SIZE = 500;



export async function POST(request: NextRequest) {

  try {

    const { supabase, user } = await getAuthenticatedContext();

    if (!user) {

      return apiError("Unauthorized", 401);

    }



    const body = await request.json();

    const { options = {}, generateAccounts = true } = body;



    const sampleData = SampleDataGenerator.generateHistoricalData(options);

    const transactions = sampleData.transactions;

    const dates = transactions.map((tx) => new Date(tx.date));

    const dateRangeStart = (dates[0] || new Date()).toISOString();

    const dateRangeEnd = (dates[dates.length - 1] || new Date()).toISOString();



    await supabase

      .from("datasets")

      .update({ is_active: false })

      .eq("user_id", user.userId);



    const { data: dataset, error: datasetError } = await supabase

      .from("datasets")

      .insert({

        user_id: user.userId,

        name: `Sample Data ${new Date().toLocaleDateString()}`,

        description: `Generated sample data with ${options.monthsOfHistory} months of history`,

        transaction_count: 0,

        date_range_start: dateRangeStart,

        date_range_end: dateRangeEnd,

        is_active: true,

        metadata: {

          source: "sample",

          format: "json",

          importedAt: new Date().toISOString(),

        },

      })

      .select("*")

      .single();



    if (datasetError || !dataset) {

      throw datasetError;

    }



    const datasetId = dataset.id;

    let createdAccounts: AccountRow[] = [];



    if (generateAccounts) {

      const { data: accounts, error } = await supabase

        .from("accounts")

        .insert(

          sampleData.accounts.map((accountData) => ({

            user_id: user.userId,

            dataset_id: datasetId,

            name: accountData.name,

            type: accountData.type,

            balance: 0,

            currency: accountData.currency,

          })),

        )

        .select("*");



      if (error) throw error;

      createdAccounts = (accounts ?? []) as AccountRow[];

    } else {

      const { data: existingAccounts, error } = await supabase

        .from("accounts")

        .select("*")

        .eq("user_id", user.userId)

        .eq("dataset_id", datasetId);



      if (error) throw error;

      createdAccounts = (existingAccounts ?? []) as AccountRow[];

    }



    if (createdAccounts.length === 0) {

      return apiError("No accounts available for sample transactions", 400);

    }



    const rows = transactions.map((transactionData, index) => {

      const accountIndex = Math.min(

        index % createdAccounts.length,

        createdAccounts.length - 1,

      );

      return {

        user_id: user.userId,

        dataset_id: datasetId,

        account_id: createdAccounts[accountIndex].id,

        type: transactionData.type,

        category: transactionData.category,

        amount: transactionData.amount,

        description: transactionData.description,

        date: new Date(transactionData.date).toISOString(),

        is_recurring: transactionData.isRecurring,

        status: transactionData.status,

        tags: transactionData.tags || [],

      };

    });



    let createdTransactions = 0;

    const errors: string[] = [];



    for (let i = 0; i < rows.length; i += INSERT_CHUNK_SIZE) {

      const chunk = rows.slice(i, i + INSERT_CHUNK_SIZE);

      const { error: insertError } = await supabase

        .from("transactions")

        .insert(chunk);

      if (insertError) {

        errors.push(

          `Batch insert failed (rows ${i + 1}-${i + chunk.length}): ${insertError.message}`,

        );

      } else {

        createdTransactions += chunk.length;

      }

    }



    await supabase

      .from("datasets")

      .update({ transaction_count: createdTransactions })

      .eq("id", datasetId);



    await activateDatasetForUser(supabase, user.userId, datasetId);



    if (createdTransactions > 0) {

      await repairDatasetAccounts(supabase, user.userId, datasetId);

      void runIntelligencePipeline(supabase, user.userId, datasetId, {

        runRules: false,

        trigger: "sample_data",

      });

    }



    return apiSuccess({

      created: {

        accounts: createdAccounts.length,

        transactions: createdTransactions,

      },

      skipped: {

        transactions: transactions.length - createdTransactions,

      },

      errors: errors.slice(0, 10),

      dataRange: {

        start: sampleData.transactions[0]?.date,

        end: sampleData.transactions[sampleData.transactions.length - 1]?.date,

        totalTransactions: sampleData.transactions.length,

      },

      dataset: {

        id: dataset.id,

        _id: dataset.id,

        name: dataset.name,

        transactionCount: createdTransactions,

        isActive: true,

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

    const { supabase, user } = await getAuthenticatedContext();

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



    let data: string;

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



    return new Response(data, {

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


