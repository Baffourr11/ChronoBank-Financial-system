import type { IRule, RuleAction, RuleCondition } from "../models/Rule";
import {
  ConditionEvaluator,
  type EvaluationContext,
} from "./ConditionEvaluator";
import {
  computeMonthlySpendByCategory,
  getMonthStart,
} from "@/lib/finance/budgetSpend";
import { ActionExecutor } from "./ActionExecutor";
import { getSupabaseAdmin } from "../supabase/admin";
import { toIRule } from "../mappers";
import type { RuleRow } from "../supabase/types";

export interface RuleRunResult {
  ruleId: string;
  fired: boolean;
  conditionsMet: string[];
  failedCondition?: string;
  actionsExecuted: number;
  status: "fired" | "skipped" | "failed";
  error?: string;
}

export class RuleEngine {
  /** Run one rule and return whether it fired (for UI feedback). */
  static async runSingleRule(
    supabase: import("@supabase/supabase-js").SupabaseClient,
    userId: string,
    ruleId: string,
    triggerData?: Record<string, unknown>,
  ): Promise<RuleRunResult | null> {
    const { data: row, error } = await supabase
      .from("rules")
      .select("*")
      .eq("id", ruleId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !row) return null;

    const rule = toIRule(row as RuleRow);
    if (!rule.isActive) {
      return {
        ruleId,
        fired: false,
        conditionsMet: [],
        failedCondition: "Rule is inactive",
        actionsExecuted: 0,
        status: "skipped",
      };
    }

    const datasetId = rule.datasetId ?? null;
    const context = await this.buildEvaluationContext(
      supabase,
      userId,
      datasetId,
      { ...triggerData, ruleId },
    );

    const ruleContext = {
      ...context,
      datasetId: rule.datasetId ?? context.datasetId,
      ruleId: rule._id,
    };

    return this.processRuleWithResult(rule, ruleContext, triggerData);
  }

  static async processRules(
    supabase: import("@supabase/supabase-js").SupabaseClient,
    userId: string,
    triggerData?: Record<string, unknown>,
    datasetId?: string | null,
  ): Promise<void> {
    try {

      let rulesQuery = supabase
        .from("rules")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("priority", { ascending: true });

      if (datasetId) {
        rulesQuery = rulesQuery.eq("dataset_id", datasetId);
      }

      const { data: rules, error } = await rulesQuery;
      if (error) throw error;

      const targetRuleId =
        typeof triggerData?.ruleId === "string" ? triggerData.ruleId : null;

      const rows = ((rules ?? []) as RuleRow[]).filter(
        (row) => !targetRuleId || row.id === targetRuleId,
      );

      const resolvedDatasetId =
        datasetId ?? (rows[0] as RuleRow | undefined)?.dataset_id ?? null;

      const context = await this.buildEvaluationContext(
        supabase,
        userId,
        resolvedDatasetId,
        triggerData,
      );

      for (const row of rows) {
        const rule = toIRule(row);
        const ruleContext = {
          ...context,
          datasetId: rule.datasetId ?? context.datasetId,
          ruleId: rule._id,
        };
        await this.processRuleWithResult(rule, ruleContext, triggerData);
      }
    } catch (error) {
      console.error("Error processing rules:", error);
    }
  }

  static async processScheduledRules(): Promise<void> {
    try {
      const supabase = getSupabaseAdmin();
      const now = new Date();

      const { data: rules, error } = await supabase
        .from("rules")
        .select("*")
        .eq("is_active", true);

      if (error) throw error;

      for (const row of (rules ?? []) as RuleRow[]) {
        const rule = toIRule(row);
        const scheduleType = rule.schedule?.type;
        if (scheduleType !== "once" && scheduleType !== "recurring") {
          continue;
        }

        if (this.shouldExecuteScheduledRule(rule, now)) {
          const context = await this.buildEvaluationContext(
            supabase,
            rule.userId,
            rule.datasetId ?? null,
          );
          await this.processRuleWithResult(rule, context, {
            type: "scheduled",
            time: now,
          });
        }
      }
    } catch (error) {
      console.error("Error processing scheduled rules:", error);
    }
  }

  private static async processRuleWithResult(
    rule: IRule,
    context: EvaluationContext,
    triggerData?: unknown,
  ): Promise<RuleRunResult> {
    const startTime = Date.now();
    let executionStatus: "success" | "failed" | "partial" = "success";
    let errorMessage: string | undefined;
    let actionsExecuted: unknown[] = [];

    try {
      const result = ConditionEvaluator.evaluateAllConditions(
        rule.conditions,
        context,
      );

      if (result.met) {
        actionsExecuted = await ActionExecutor.executeActions(
          rule.actions,
          rule.userId,
          context,
        );

        const failedActions = actionsExecuted.filter(
          (action: { status?: string }) => action.status === "failed",
        );
        if (failedActions.length > 0) {
          executionStatus =
            failedActions.length === rule.actions.length ? "failed" : "partial";
        } else {
          executionStatus = "success";
        }

        await context.supabase
          .from("rules")
          .update({
            execution_count: rule.executionCount + 1,
            last_executed: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", rule._id!);

        await this.logRuleExecution(context.supabase, {
          userId: rule.userId,
          ruleId: rule._id!,
          triggeredBy:
            (triggerData as { type?: string })?.type || "manual",
          conditionsMet: result.metConditions,
          actionsExecuted,
          status: executionStatus,
          error: errorMessage,
          executionTime: Date.now() - startTime,
        });

        return {
          ruleId: rule._id!,
          fired: true,
          conditionsMet: result.metConditions,
          actionsExecuted: actionsExecuted.filter(
            (a: { status?: string }) => a.status === "success",
          ).length,
          status: executionStatus === "failed" ? "failed" : "fired",
          error: errorMessage,
        };
      }

      await this.logRuleExecution(context.supabase, {
        userId: rule.userId,
        ruleId: rule._id!,
        triggeredBy: (triggerData as { type?: string })?.type || "manual",
        conditionsMet: result.metConditions,
        actionsExecuted: [],
        status: "skipped",
        error: result.failedCondition,
        executionTime: Date.now() - startTime,
      });

      return {
        ruleId: rule._id!,
        fired: false,
        conditionsMet: result.metConditions,
        failedCondition: result.failedCondition,
        actionsExecuted: 0,
        status: "skipped",
      };
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Unknown error";

      await this.logRuleExecution(context.supabase, {
        userId: rule.userId,
        ruleId: rule._id!,
        triggeredBy: (triggerData as { type?: string })?.type || "manual",
        conditionsMet: [],
        actionsExecuted,
        status: "failed",
        error: errorMessage,
        executionTime: Date.now() - startTime,
      });

      return {
        ruleId: rule._id!,
        fired: false,
        conditionsMet: [],
        actionsExecuted: 0,
        status: "failed",
        error: errorMessage,
      };
    }
  }

  private static async buildEvaluationContext(
    supabase: import("@supabase/supabase-js").SupabaseClient,
    userId: string,
    datasetId: string | null,
    triggerData?: Record<string, unknown>,
  ): Promise<EvaluationContext> {
    if (!datasetId) {
      return {
        supabase,
        datasetId: undefined,
        transactions: [],
        accounts: [],
        budgets: [],
        predictions: {},
        patterns: [],
        currentDate: new Date(),
        triggerData,
        monthlySpendByCategory: {},
      };
    }

    const monthStartIso = getMonthStart().toISOString();

    const [
      { data: accountRows },
      { data: txRows },
      { data: monthExpenseRows },
      { data: budgetRows },
      { data: predictionRows },
      { data: patternRows },
    ] = await Promise.all([
      supabase
        .from("accounts")
        .select("id, name, balance, type, currency")
        .eq("user_id", userId)
        .eq("dataset_id", datasetId),
      supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .eq("dataset_id", datasetId)
        .order("date", { ascending: false })
        .limit(500),
      supabase
        .from("transactions")
        .select("category, amount, type, date")
        .eq("user_id", userId)
        .eq("dataset_id", datasetId)
        .eq("type", "expense")
        .gte("date", monthStartIso),
      supabase
        .from("budgets")
        .select("*")
        .eq("user_id", userId)
        .eq("dataset_id", datasetId),
      supabase
        .from("predictions")
        .select("*")
        .eq("user_id", userId)
        .eq("dataset_id", datasetId)
        .order("created_at", { ascending: false }),
      supabase
        .from("behavior_patterns")
        .select("*")
        .eq("user_id", userId)
        .eq("dataset_id", datasetId)
        .order("confidence", { ascending: false })
        .limit(20),
    ]);

    const predictions: EvaluationContext["predictions"] = {};
    for (const row of predictionRows ?? []) {
      if (predictions[row.prediction_type]) continue;
      predictions[row.prediction_type] = {
        predictionType: row.prediction_type,
        predictedValue:
          row.predicted_value != null ? Number(row.predicted_value) : null,
        confidence: row.confidence != null ? Number(row.confidence) : null,
        metadata: (row.metadata as Record<string, unknown>) ?? {},
      };
    }

    const monthlySpendByCategory = computeMonthlySpendByCategory(
      (monthExpenseRows ?? []).map((t) => ({
        type: t.type,
        category: t.category,
        amount: Number(t.amount),
        date: t.date,
      })),
    );

    return {
      supabase,
      datasetId,
      transactions: (txRows ?? []).map((t) => ({
        id: t.id,
        type: t.type,
        category: t.category,
        amount: Number(t.amount),
        description: t.description,
        date: t.date,
        status: t.status,
      })),
      accounts: (accountRows ?? []).map((a) => ({
        id: a.id,
        name: a.name,
        balance: Number(a.balance),
        type: a.type,
        currency: a.currency,
      })),
      budgets: budgetRows ?? [],
      predictions,
      patterns: patternRows ?? [],
      currentDate: new Date(),
      triggerData,
      monthlySpendByCategory,
    };
  }

  private static shouldExecuteScheduledRule(rule: IRule, now: Date): boolean {
    const { schedule, lastExecuted } = rule;

    if (schedule.type === "once") {
      if (lastExecuted) return false;

      if (schedule.time) {
        const [hours, minutes] = schedule.time.split(":").map(Number);
        const scheduledTime = new Date(now);
        scheduledTime.setHours(hours, minutes, 0, 0);
        return scheduledTime <= now;
      }

      return true;
    }

    if (schedule.type === "recurring") {
      if (!lastExecuted) return true;

      const lastExecution = new Date(lastExecuted);

      switch (schedule.frequency) {
        case "daily":
          if (schedule.time) {
            const [hours, minutes] = schedule.time.split(":").map(Number);
            const scheduledTime = new Date(now);
            scheduledTime.setHours(hours, minutes, 0, 0);
            return scheduledTime > lastExecution && scheduledTime <= now;
          }
          return now.toDateString() !== lastExecution.toDateString();

        case "weekly":
          if (schedule.dayOfWeek !== undefined && schedule.time) {
            const [hours, minutes] = schedule.time.split(":").map(Number);
            const scheduledTime = new Date(now);
            scheduledTime.setHours(hours, minutes, 0, 0);

            const daysDiff = Math.floor(
              (now.getTime() - lastExecution.getTime()) / (1000 * 60 * 60 * 24),
            );
            return (
              scheduledTime.getDay() === schedule.dayOfWeek && daysDiff >= 7
            );
          }
          return false;

        case "monthly":
          if (schedule.dayOfMonth !== undefined && schedule.time) {
            const [hours, minutes] = schedule.time.split(":").map(Number);
            const scheduledTime = new Date(now);
            scheduledTime.setHours(hours, minutes, 0, 0);

            return (
              scheduledTime.getDate() === schedule.dayOfMonth &&
              scheduledTime.getMonth() > lastExecution.getMonth()
            );
          }
          return false;

        case "yearly":
          if (schedule.dayOfMonth !== undefined && schedule.time) {
            const [hours, minutes] = schedule.time.split(":").map(Number);
            const scheduledTime = new Date(now);
            scheduledTime.setHours(hours, minutes, 0, 0);

            return (
              scheduledTime.getDate() === schedule.dayOfMonth &&
              scheduledTime.getMonth() === lastExecution.getMonth() &&
              scheduledTime.getFullYear() > lastExecution.getFullYear()
            );
          }
          return false;

        default:
          return false;
      }
    }

    return false;
  }

  private static async logRuleExecution(
    supabase: import("@supabase/supabase-js").SupabaseClient,
    executionData: {
    userId: string;
    ruleId: string;
    triggeredBy: string;
    conditionsMet: string[];
    actionsExecuted: unknown[];
    status: "success" | "failed" | "partial" | "skipped";
    error?: string;
    executionTime: number;
  },
  ): Promise<void> {
    try {
      await supabase.from("rule_executions").insert({
        user_id: executionData.userId,
        rule_id: executionData.ruleId,
        triggered_by: executionData.triggeredBy,
        conditions_met: executionData.conditionsMet,
        actions_executed: executionData.actionsExecuted,
        status: executionData.status,
        error: executionData.error ?? null,
        execution_time: executionData.executionTime,
      });
    } catch (error) {
      console.error("Error logging rule execution:", error);
    }
  }

  static createTaxReserveRule(
    userId: string,
    taxPercentage: number,
    thresholdAmount: number,
  ) {
    return {
      userId,
      name: "Tax Reserve Automation",
      description: `Automatically reserve ${taxPercentage}% of income for taxes when income exceeds ${thresholdAmount}`,
      isActive: true,
      priority: 8,
      conditions: [
        {
          type: "transaction" as const,
          operator: "greater_than" as const,
          field: "amount",
          value: thresholdAmount,
        },
        {
          type: "transaction" as const,
          operator: "equals" as const,
          field: "type",
          value: "income",
        },
      ],
      actions: [
        {
          type: "create_transaction" as const,
          params: {
            accountId: null,
            type: "expense",
            category: "Taxes",
            amount: 0,
            description: `Tax reserve (${taxPercentage}% of income)`,
          },
        },
      ],
      schedule: {
        type: "triggered" as const,
      },
      executionCount: 0,
    };
  }

  static createLowBalanceAlertRule(
    userId: string,
    thresholdAmount: number,
    accountName: string,
  ) {
    return {
      userId,
      name: "Low Balance Alert",
      description: `Alert when ${accountName} balance falls below ${thresholdAmount}`,
      isActive: true,
      priority: 9,
      conditions: [
        {
          type: "balance" as const,
          operator: "less_than" as const,
          field: accountName,
          value: thresholdAmount,
        },
      ],
      actions: [
        {
          type: "send_alert" as const,
          params: {
            type: "low_balance",
            title: "Low Balance Warning",
            message: `Your ${accountName} account balance has fallen below ${thresholdAmount}`,
            severity: "high",
            data: { accountName, thresholdAmount },
          },
        },
      ],
      schedule: {
        type: "triggered" as const,
      },
      executionCount: 0,
    };
  }

  static createSavingsRule(
    userId: string,
    savingsPercentage: number,
    sourceAccount: string,
    targetAccount: string,
  ) {
    return {
      userId,
      name: "Automatic Savings",
      description: `Transfer ${savingsPercentage}% of income to savings account`,
      isActive: true,
      priority: 7,
      conditions: [
        {
          type: "transaction" as const,
          operator: "equals" as const,
          field: "type",
          value: "income",
        },
        {
          type: "transaction" as const,
          operator: "greater_than" as const,
          field: "amount",
          value: 0,
        },
      ],
      actions: [
        {
          type: "transfer" as const,
          params: {
            fromAccountId: null,
            toAccountId: null,
            amount: 0,
            description: `Automatic savings transfer (${savingsPercentage}%)`,
          },
        },
      ],
      schedule: {
        type: "triggered" as const,
      },
      executionCount: 0,
    };
  }
}

// Re-export types used by ActionExecutor
export type { RuleCondition, RuleAction };
