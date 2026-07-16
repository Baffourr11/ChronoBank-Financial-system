import { NextRequest } from "next/server";

import { getAuthenticatedContext } from "@/lib/api/helpers";

import { apiSuccess, apiError } from "@/lib/api";


import { runIntelligencePipeline } from "@/lib/intelligence/pipeline";

import type { DatasetRow } from "@/lib/supabase/types";

import { parseUploadFile } from "@/lib/data/parseUploadFile";

import {
  activateDatasetForUser,
  importTransactionsForDataset,
} from "@/lib/data/importDatasetTransactions";
import { repairDatasetAccounts } from "@/lib/data/repairDatasetAccounts";



export async function GET(request: NextRequest) {

  try {

    const { supabase, user } = await getAuthenticatedContext();

    if (!user) {

      return apiError("Unauthorized", 401);

    }



    const { searchParams } = new URL(request.url);



    let query = supabase

      .from("datasets")

      .select("*")

      .eq("user_id", user.userId)

      .order("created_at", { ascending: false });



    if (searchParams.get("includeInactive") === "false") {

      query = query.eq("is_active", true);

    }



    const { data: datasets, error } = await query;

    if (error) throw error;



    return apiSuccess({

      datasets: ((datasets ?? []) as DatasetRow[]).map((dataset) => ({

        _id: dataset.id,

        name: dataset.name,

        description: dataset.description,

        transactionCount: dataset.transaction_count,

        dateRange: {

          start: dataset.date_range_start,

          end: dataset.date_range_end,

          totalDays: Math.ceil(

            (new Date(dataset.date_range_end).getTime() -

              new Date(dataset.date_range_start).getTime()) /

              (1000 * 60 * 60 * 24),

          ),

        },

        isActive: dataset.is_active,

        metadata: dataset.metadata,

        createdAt: dataset.created_at,

        updatedAt: dataset.updated_at,

      })),

    });

  } catch (error) {

    console.error("Get datasets error:", error);

    return apiError("Failed to fetch datasets", 500);

  }

}



export async function POST(request: NextRequest) {

  try {

    const { supabase, user } = await getAuthenticatedContext();

    if (!user) {

      return apiError("Unauthorized", 401);

    }



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



    const fileExtension = file.name.split(".").pop()?.toLowerCase();

    if (!["xlsx", "xls", "csv"].includes(fileExtension || "")) {

      return apiError(

        "Only Excel (.xlsx, .xls) and CSV files are supported",

        400,

      );

    }



    const bytes = await file.arrayBuffer();

    const buffer = Buffer.from(bytes);



    let transactions;

    try {

      transactions = parseUploadFile(buffer, fileExtension || "csv");

    } catch (parseError) {

      console.error("File parsing error:", parseError);

      return apiError("Failed to parse file. Please check the format.", 400);

    }



    if (transactions.length === 0) {

      return apiError("No valid transactions found in file", 400);

    }



    const dates = transactions

      .map((tx) => new Date(tx.date))

      .filter((date) => !isNaN(date.getTime()))

      .sort((a, b) => a.getTime() - b.getTime());



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

        name: datasetName,

        description: description || "",

        transaction_count: 0,

        date_range_start: dateRangeStart,

        date_range_end: dateRangeEnd,

        is_active: true,

        metadata: {

          source: "upload",

          format: fileExtension,

          importedAt: new Date().toISOString(),

        },

      })

      .select("*")

      .single();



    if (datasetError || !dataset) {

      throw datasetError;

    }



    const datasetId = dataset.id;



    const importResult = await importTransactionsForDataset(

      supabase,

      user.userId,

      datasetId,

      transactions,

    );



    await supabase

      .from("datasets")

      .update({

        transaction_count: importResult.imported,

        updated_at: new Date().toISOString(),

      })

      .eq("id", datasetId);



    await activateDatasetForUser(supabase, user.userId, datasetId);



    if (importResult.imported > 0) {

      await repairDatasetAccounts(supabase, user.userId, datasetId);

      void runIntelligencePipeline(supabase, user.userId, datasetId, {

        runRules: false,

        trigger: "dataset_upload",

      });

    }



    return apiSuccess(

      {

        dataset: {

          _id: dataset.id,

          id: dataset.id,

          name: dataset.name,

          description: dataset.description,

          transactionCount: importResult.imported,

          dateRange: {

            start: dataset.date_range_start,

            end: dataset.date_range_end,

            totalDays: Math.ceil(

              (new Date(dataset.date_range_end).getTime() -

                new Date(dataset.date_range_start).getTime()) /

                (1000 * 60 * 60 * 24),

            ),

          },

          isActive: true,

          metadata: dataset.metadata,

        },

        importResult: {

          total: transactions.length,

          imported: importResult.imported,

          skipped: importResult.skipped,

          errors: importResult.errors.slice(0, 20),

        },

      },

      201,

    );

  } catch (error) {

    console.error("Dataset upload error:", error);

    return apiError("Failed to upload dataset", 500);

  }

}


