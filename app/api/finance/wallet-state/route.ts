import { NextRequest } from "next/server";

import { getAuthenticatedContext } from "@/lib/api/helpers";

import { apiSuccess, apiError } from "@/lib/api";

import {

  getDatasetIdFromRequest,

  resolveDatasetId,

} from "@/lib/dataset/resolveDataset";

import { buildWalletState } from "@/lib/finance/computeWalletState";

import { fetchWalletStateForDataset } from "@/lib/finance/fetchWalletState";



export async function GET(request: NextRequest) {

  try {

    const { supabase, user } = await getAuthenticatedContext();

    if (!user) return apiError("Unauthorized", 401);



    const { searchParams } = new URL(request.url);

    const datasetId = await resolveDatasetId(

      supabase,

      user.userId,

      getDatasetIdFromRequest(searchParams),

    );



    if (!datasetId) {

      return apiSuccess({

        datasetId: null,

        wallet: buildWalletState({

          currentBalance: 0,

          budgets: [],

          predictions: [],

          automation: {

            activeRules: 0,

            unreadAlerts: 0,

            recentExecutions: 0,

          },

        }),

      });

    }



    const wallet = await fetchWalletStateForDataset(

      supabase,

      user.userId,

      datasetId,

    );



    return apiSuccess({ datasetId, wallet });

  } catch (error) {

    console.error("Wallet state error:", error);

    return apiError("Failed to compute wallet state", 500);

  }

}


