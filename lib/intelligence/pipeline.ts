import type { SupabaseClient } from "@supabase/supabase-js";

import {

  runChainReaction,

  type ChainReactionEvent,

} from "@/lib/automation/chainReaction";



export interface PipelineOptions {

  runRules?: boolean;

  trigger?: string;

  skipIntelligence?: boolean;

}



export interface PipelineResult {

  intelligenceRefreshed: boolean;

  rulesProcessed: boolean;

  automation?: import("@/lib/automation/types").AutomationLayerResult | null;

}



/**

 * Canonical thesis pipeline: patterns + forecast persist, automation layer, then rules.

 */

export async function runIntelligencePipeline(

  supabase: SupabaseClient,

  userId: string,

  datasetId: string,

  options: PipelineOptions = {},

): Promise<PipelineResult> {

  const {

    runRules = true,

    trigger = "intelligence_refresh",

    skipIntelligence = false,

  } = options;



  const result = await runChainReaction(

    supabase,

    userId,

    datasetId,

    { type: trigger as ChainReactionEvent["type"] },

    { runRules, skipIntelligence },

  );



  return {

    intelligenceRefreshed: result.intelligenceRefreshed,

    rulesProcessed: result.rulesProcessed,

    automation: result.automation,

  };

}

