import { RuleAction } from "../models/Rule";
import { RuleExecutionAction } from "../models/RuleExecution";
import { recalculateBalanceForAccount } from "../finance/recalculateBalances";
import type { EvaluationContext } from "./ConditionEvaluator";
import type { AlertNavigationPayload } from "@/lib/alerts/navigation";
import { insertDedupedAlert } from "@/lib/alerts/dedupe";

export class ActionExecutor {
  static async executeActions(
    actions: RuleAction[],
    userId: string,
    context: EvaluationContext,
  ): Promise<RuleExecutionAction[]> {
    const results: RuleExecutionAction[] = [];

    for (const action of actions) {
      const startTime = Date.now();

      try {
        if (action.delay && action.delay > 0) {
          await this.delay(action.delay * 60 * 1000);
        }

        const result = await this.executeAction(action, userId, context);

        results.push({
          type: action.type,
          status: "success",
          result,
          duration: Date.now() - startTime,
        });
      } catch (error) {
        results.push({
          type: action.type,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
          duration: Date.now() - startTime,
        });
      }
    }

    return results;
  }

  private static async executeAction(
    action: RuleAction,
    userId: string,
    context: EvaluationContext,
  ): Promise<unknown> {
    switch (action.type) {
      case "create_transaction":
        return this.createTransaction(action.params, userId, context);
      case "send_alert":
        return this.sendAlert(action.params, userId, context);
      case "update_account":
        return this.updateAccount(action.params, userId, context);
      case "create_budget":
        return this.createBudget(action.params, userId, context);
      case "transfer":
        return this.transferFunds(action.params, userId, context);
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  private static async createTransaction(
    params: Record<string, unknown>,
    userId: string,
    context: EvaluationContext,
  ) {
    const supabase = context.supabase;
    const datasetId = context.datasetId;
    if (!datasetId) throw new Error("Dataset context required");

    let accountId = params.accountId as string | undefined;
    if (!accountId && params.accountName) {
      const account = context.accounts.find(
        (a) => a.name === params.accountName,
      );
      accountId = account?.id;
    }
    if (!accountId && context.accounts.length > 0) {
      accountId = context.accounts[0].id;
    }
    if (!accountId) throw new Error("No account available for transaction");

    const type = (params.type as string) || "expense";
    const amount = Number(params.amount) || 0;
    const category = (params.category as string) || "Automation";
    const description =
      (params.description as string) || `Automated ${type} via rule`;

    const { data: tx, error } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        dataset_id: datasetId,
        account_id: accountId,
        type,
        category,
        amount,
        description,
        date: new Date().toISOString(),
        status: "completed",
        tags: ["automation"],
      })
      .select("id")
      .single();

    if (error) throw error;

    await recalculateBalanceForAccount(
      supabase,
      userId,
      accountId,
      datasetId,
    );

    return { transactionId: tx?.id, type, amount, category };
  }

  private static buildAlertNavigationData(
    params: Record<string, unknown>,
    context: EvaluationContext,
  ): AlertNavigationPayload {
    const fromParams = (params.data as AlertNavigationPayload | undefined) ?? {};
    const data: AlertNavigationPayload = { ...fromParams };

    const triggerTx = context.triggerData?.transaction as
      | Record<string, unknown>
      | undefined;

    if (triggerTx?.date) {
      const dateStr = new Date(String(triggerTx.date))
        .toISOString()
        .split("T")[0];
      data.transactionDate = dateStr;
      data.navigateTo = "timeline";
      if (triggerTx.id) data.transactionId = String(triggerTx.id);
      if (triggerTx.category) data.category = String(triggerTx.category);
      if (triggerTx.amount != null) data.amount = Number(triggerTx.amount);
    }

    if (!data.transactionDate) {
      const category =
        (params.category as string) ||
        (data.category as string | undefined);
      const latest = this.findLatestExpense(context, category);
      if (latest?.date) {
        data.transactionDate = new Date(String(latest.date))
          .toISOString()
          .split("T")[0];
        data.navigateTo = "timeline";
        if (latest.id) data.transactionId = String(latest.id);
        if (latest.category) data.category = String(latest.category);
        if (latest.amount != null) data.amount = Number(latest.amount);
      }
    }

    if (data.transactionDate) {
      data.navigateTo = "timeline";
    }

    return data;
  }

  private static findLatestExpense(
    context: EvaluationContext,
    category?: string,
  ): Record<string, unknown> | null {
    const pool: Array<Record<string, unknown>> = [];
    if (context.triggerData?.transaction) {
      pool.push(context.triggerData.transaction as Record<string, unknown>);
    }
    pool.push(...context.transactions);

    for (const tx of pool) {
      if (tx.type !== "expense") continue;
      if (category && String(tx.category) !== category) continue;
      return tx;
    }
    return null;
  }

  private static async sendAlert(
    params: Record<string, unknown>,
    userId: string,
    context: EvaluationContext,
  ) {
    const supabase = context.supabase;
    const alertData = this.buildAlertNavigationData(params, context);
    const triggerTx = context.triggerData?.transaction as
      | Record<string, unknown>
      | undefined;

    let title = (params.title as string) || "Automation alert";
    let message = (params.message as string) || "A rule condition was met.";
    const severity = (params.severity as string) || "medium";
    let type = (params.type as string) || "automation";

    const matchedCategory = context.triggerData?.matchedBudgetCategory as
      | string
      | undefined;
    const matchedPercent = context.triggerData?.matchedBudgetPercentUsed as
      | number
      | undefined;

    if (matchedCategory) {
      if (!params.type) type = "budget_exceeded";
      alertData.category = matchedCategory;
      alertData.navigateTo = "timeline";
      const latest = this.findLatestExpense(context, matchedCategory);
      if (latest?.date) {
        alertData.transactionDate = new Date(String(latest.date))
          .toISOString()
          .split("T")[0];
        if (latest.id) alertData.transactionId = String(latest.id);
      }
      if (matchedPercent != null) {
        message = `${matchedCategory} is at ${matchedPercent.toFixed(0)}% of its monthly budget. ${message}`;
      }
    }

    if (triggerTx?.date && triggerTx.type === "expense") {
      const amt = Number(triggerTx.amount) || 0;
      const cat = triggerTx.category ? String(triggerTx.category) : "expense";
      const dayLabel = new Date(String(triggerTx.date)).toLocaleDateString(
        undefined,
        { month: "short", day: "numeric", year: "numeric" },
      );
      if (params.type === "large_expense" || title.toLowerCase().includes("large expense")) {
        message = `A large ${cat} expense of GHS ${amt.toLocaleString()} was recorded on ${dayLabel}. Tap to view that day.`;
      }
    }

    const triggerType =
      typeof context.triggerData?.type === "string"
        ? context.triggerData.type
        : undefined;

    const result = await insertDedupedAlert(
      supabase,
      {
        user_id: userId,
        dataset_id: context.datasetId ?? null,
        rule_id: context.ruleId ?? null,
        type,
        title,
        message,
        severity: ["low", "medium", "high"].includes(severity)
          ? (severity as "low" | "medium" | "high")
          : "medium",
        data: alertData,
      },
      {
        triggerType,
        category: matchedCategory ?? (alertData.category as string | undefined),
      },
    );

    return {
      alertId: result.alertId,
      title,
      message,
      skipped: result.skipped,
    };
  }

  private static async updateAccount(
    params: Record<string, unknown>,
    userId: string,
    context: EvaluationContext,
  ) {
    const supabase = context.supabase;
    const accountId = params.accountId as string;
    const updates = (params.updates as Record<string, unknown>) || {};

    if (!accountId) throw new Error("accountId required");

    const { data, error } = await supabase
      .from("accounts")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", accountId)
      .eq("user_id", userId)
      .select("id, name, balance")
      .single();

    if (error) throw error;
    return data;
  }

  private static async createBudget(
    params: Record<string, unknown>,
    userId: string,
    context: EvaluationContext,
  ) {
    if (!context.datasetId) throw new Error("Dataset context required");

    const supabase = context.supabase;
    const category = (params.category as string) || "General";
    const limitAmount = Number(params.limitAmount) || 0;
    const period = (params.period as string) || "monthly";

    const { data, error } = await supabase
      .from("budgets")
      .insert({
        user_id: userId,
        dataset_id: context.datasetId,
        category,
        limit_amount: limitAmount,
        period,
        alert_threshold: Number(params.alertThreshold) || 80,
      })
      .select("id")
      .single();

    if (error) throw error;

    await supabase.from("recommendations").insert({
      user_id: userId,
      dataset_id: context.datasetId,
      recommendation: `Budget set for ${category}: ${limitAmount} (${period})`,
      priority: "medium",
      status: "active",
      source: "rule_engine",
      metadata: params,
    });

    return { budgetId: data?.id, category, limitAmount };
  }

  private static async transferFunds(
    params: Record<string, unknown>,
    userId: string,
    context: EvaluationContext,
  ) {
    const fromAccountId = params.fromAccountId as string;
    const toAccountId = params.toAccountId as string;
    const amount = Number(params.amount);
    const description =
      (params.description as string) || "Automated transfer";

    if (!fromAccountId || !toAccountId || !amount) {
      throw new Error("fromAccountId, toAccountId, and amount required");
    }

    const supabase = context.supabase;
    const datasetId = context.datasetId;
    if (!datasetId) throw new Error("Dataset context required");

    await supabase.from("transactions").insert([
      {
        user_id: userId,
        dataset_id: datasetId,
        account_id: fromAccountId,
        type: "expense",
        category: "Transfer",
        amount,
        description: `${description} (out)`,
        status: "completed",
        tags: ["automation", "transfer"],
      },
      {
        user_id: userId,
        dataset_id: datasetId,
        account_id: toAccountId,
        type: "income",
        category: "Transfer",
        amount,
        description: `${description} (in)`,
        status: "completed",
        tags: ["automation", "transfer"],
      },
    ]);

    await recalculateBalanceForAccount(
      supabase,
      userId,
      fromAccountId,
      datasetId,
    );
    await recalculateBalanceForAccount(
      supabase,
      userId,
      toAccountId,
      datasetId,
    );

    return { fromAccountId, toAccountId, amount };
  }

  private static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
