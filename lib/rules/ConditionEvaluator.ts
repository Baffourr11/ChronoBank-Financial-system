// Path: lib/rules/ConditionEvaluator.ts
import { RuleCondition } from "../models/Rule";
import {
  budgetPercentUsed,
  spentForBudgetCategory,
} from "@/lib/finance/budgetSpend";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface PredictionSnapshot {
  predictionType: string;
  predictedValue: number | null;
  confidence: number | null;
  metadata: Record<string, unknown>;
}

export interface EvaluationContext {
  supabase: SupabaseClient;
  datasetId?: string;
  ruleId?: string;
  transactions: Array<Record<string, unknown>>;
  accounts: Array<{
    id: string;
    name: string;
    balance: number;
    type?: string;
    currency?: string;
  }>;
  budgets: Array<Record<string, unknown>>;
  predictions: Record<string, PredictionSnapshot>;
  patterns: Array<Record<string, unknown>>;
  currentDate: Date;
  triggerData?: Record<string, unknown>;
  /** Current-month spend by category (full month query, matches Budgets page) */
  monthlySpendByCategory: Record<string, number>;
}

export class ConditionEvaluator {
  static evaluateCondition(
    condition: RuleCondition,
    context: EvaluationContext,
  ): boolean {
    switch (condition.type) {
      case "balance":
        return this.evaluateBalanceCondition(condition, context);
      case "transaction":
        return this.evaluateTransactionCondition(condition, context);
      case "category":
        return this.evaluateCategoryCondition(condition, context);
      case "amount":
        return this.evaluateAmountCondition(condition, context);
      case "date":
        return this.evaluateDateCondition(condition, context);
      case "account":
        return this.evaluateAccountCondition(condition, context);
      case "predicted_balance":
        return this.evaluatePredictedBalanceCondition(condition, context);
      case "cash_flow_risk":
        return this.evaluateCashFlowRiskCondition(condition, context);
      case "budget":
        return this.evaluateBudgetCondition(condition, context);
      default:
        return false;
    }
  }

  static evaluateAllConditions(
    conditions: RuleCondition[],
    context: EvaluationContext,
  ): {
    met: boolean;
    metConditions: string[];
    failedCondition?: string;
  } {
    if (!conditions.length) {
      return {
        met: false,
        metConditions: [],
        failedCondition: "No conditions defined",
      };
    }

    const metConditions: string[] = [];

    for (const condition of conditions) {
      const isMet = this.evaluateCondition(condition, context);
      const label = this.describeCondition(condition, context);
      if (isMet) {
        metConditions.push(label);
      } else {
        return { met: false, metConditions, failedCondition: label };
      }
    }

    return { met: true, metConditions };
  }

  private static describeCondition(
    condition: RuleCondition,
    context?: EvaluationContext,
  ): string {
    const field =
      condition.field && String(condition.field) !== "*"
        ? ` (${condition.field})`
        : "";
    const base = `${condition.type}${field} ${condition.operator} ${condition.value}`;
    if (condition.type === "budget" && context?.triggerData?.lastBudgetCheck) {
      const c = context.triggerData.lastBudgetCheck as {
        category: string;
        percentUsed: number;
        spent: number;
        limit: number;
      };
      return `${base} — ${c.category} is at ${c.percentUsed}% (GHS ${c.spent.toFixed(0)} of GHS ${c.limit.toFixed(0)} this month)`;
    }
    return base;
  }

  private static evaluateBalanceCondition(
    condition: RuleCondition,
    context: EvaluationContext,
  ): boolean {
    const account = context.accounts.find(
      (acc) => acc.name === condition.field,
    );
    if (!account) return false;

    const balance = account.balance;
    return this.compareValues(
      balance,
      condition.operator,
      condition.value,
      condition.secondaryValue,
    );
  }

  private static evaluateTransactionCondition(
    condition: RuleCondition,
    context: EvaluationContext,
  ): boolean {
    const pool: Array<Record<string, unknown>> = [...context.transactions];
    if (context.triggerData?.transaction) {
      pool.unshift(
        context.triggerData.transaction as Record<string, unknown>,
      );
    }

    if (pool.length === 0) return false;

    const latest = pool[0];

    if (condition.field === "type") {
      return this.evaluateStringCondition(
        pool.map((t) => String(t.type)),
        condition.operator,
        condition.value,
      );
    }

    if (condition.field === "amount") {
      return pool.some((t) =>
        this.compareValues(
          Number(t.amount),
          condition.operator,
          condition.value,
          condition.secondaryValue,
        ),
      );
    }

    if (condition.field === "category" || condition.field === "description") {
      return pool.some((t) =>
        this.evaluateStringCondition(
          [String(t[condition.field] ?? "")],
          condition.operator,
          condition.value,
        ),
      );
    }

    return this.compareValues(
      latest[condition.field],
      condition.operator,
      condition.value,
      condition.secondaryValue,
    );
  }

  private static evaluateCategoryCondition(
    condition: RuleCondition,
    context: EvaluationContext,
  ): boolean {
    const tx = this.getTriggerTransaction(context);
    if (tx?.category) {
      return this.evaluateStringCondition(
        [String(tx.category)],
        condition.operator,
        String(condition.value),
      );
    }
    const categories = context.transactions
      .filter((t) => t.type === "expense")
      .map((t) => String(t.category ?? ""));
    return this.evaluateStringCondition(
      categories,
      condition.operator,
      String(condition.value),
    );
  }

  private static evaluateAmountCondition(
    condition: RuleCondition,
    context: EvaluationContext,
  ): boolean {
    const tx = this.getTriggerTransaction(context);
    if (tx?.amount != null) {
      return this.compareValues(
        Number(tx.amount),
        condition.operator,
        Number(condition.value),
        condition.secondaryValue != null
          ? Number(condition.secondaryValue)
          : undefined,
      );
    }
    const amounts = context.transactions.map((t) => Number(t.amount ?? 0));
    return this.evaluateArrayCondition(
      amounts,
      condition.operator,
      Number(condition.value),
      condition.secondaryValue != null
        ? Number(condition.secondaryValue)
        : undefined,
    );
  }

  private static getTriggerTransaction(
    context: EvaluationContext,
  ): Record<string, unknown> | null {
    const raw = context.triggerData?.transaction;
    if (raw && typeof raw === "object") {
      return raw as Record<string, unknown>;
    }
    return null;
  }

  private static evaluatePredictedBalanceCondition(
    condition: RuleCondition,
    context: EvaluationContext,
  ): boolean {
    const horizon = String(condition.field || "30d").replace("cash_flow_", "");
    const typeKey =
      horizon === "7" || horizon === "7d"
        ? "cash_flow_7d"
        : horizon === "90" || horizon === "90d"
          ? "cash_flow_90d"
          : "cash_flow_30d";

    const pred = context.predictions[typeKey];
    if (!pred) return false;

    const meta = pred.metadata ?? {};
    const balance =
      Number(meta.lowestBalance ?? pred.predictedValue ?? 0) || 0;

    return this.compareValues(
      balance,
      condition.operator,
      Number(condition.value),
      condition.secondaryValue != null
        ? Number(condition.secondaryValue)
        : undefined,
    );
  }

  private static evaluateCashFlowRiskCondition(
    condition: RuleCondition,
    context: EvaluationContext,
  ): boolean {
    const pred = context.predictions["low_balance_risk"];
    if (!pred) return false;

    const issue = pred.metadata?.issue as
      | { severity?: string }
      | undefined;
    const severity = issue?.severity ?? "medium";

    if (condition.operator === "equals") {
      return (
        String(severity).toLowerCase() ===
        String(condition.value).toLowerCase()
      );
    }
    if (condition.operator === "contains") {
      return String(severity)
        .toLowerCase()
        .includes(String(condition.value).toLowerCase());
    }

    const rank = { low: 1, medium: 2, high: 3 };
    const actual = rank[severity as keyof typeof rank] ?? 0;
    const expected = rank[String(condition.value) as keyof typeof rank] ?? 0;
    return this.compareValues(actual, condition.operator, expected);
  }

  private static evaluateBudgetCondition(
    condition: RuleCondition,
    context: EvaluationContext,
  ): boolean {
    const field = String(condition.field || "").trim();
    const threshold = Number(condition.value);
    if (Number.isNaN(threshold)) return false;

    const spentByCategory = context.monthlySpendByCategory ?? {};

    const budgetsToCheck =
      !field || field === "*" || field.toLowerCase() === "any"
        ? context.budgets
        : context.budgets.filter(
            (b) =>
              String(b.category).toLowerCase() === field.toLowerCase(),
          );

    if (budgetsToCheck.length === 0) return false;

    for (const budget of budgetsToCheck) {
      const category = String(budget.category);
      const limit = Number(budget.limit_amount) || 0;
      if (limit <= 0) continue;

      const spent = spentForBudgetCategory(spentByCategory, category);
      const percentUsed = budgetPercentUsed(spent, limit);
      const matches = this.compareValues(
        percentUsed,
        condition.operator,
        threshold,
        condition.secondaryValue != null
          ? Number(condition.secondaryValue)
          : undefined,
      );

      if (matches) {
        if (context.triggerData) {
          context.triggerData.matchedBudgetCategory = category;
          context.triggerData.matchedBudgetPercentUsed = percentUsed;
          context.triggerData.matchedBudgetSpent = spent;
          context.triggerData.matchedBudgetLimit = limit;
        }
        return true;
      }

      if (
        context.triggerData &&
        field &&
        field !== "*" &&
        field.toLowerCase() !== "any"
      ) {
        context.triggerData.lastBudgetCheck = {
          category,
          spent,
          limit,
          percentUsed,
          threshold,
          operator: condition.operator,
        };
      }
    }

    return false;
  }

  private static evaluateDateCondition(
    condition: RuleCondition,
    context: EvaluationContext,
  ): boolean {
    const currentDate = context.currentDate;

    if (condition.field === "current_date") {
      return this.compareValues(
        currentDate,
        condition.operator,
        new Date(condition.value),
      );
    }

    if (condition.field === "day_of_week") {
      const dayOfWeek = currentDate.getDay();
      return this.compareValues(
        dayOfWeek,
        condition.operator,
        parseInt(condition.value),
      );
    }

    if (condition.field === "day_of_month") {
      const dayOfMonth = currentDate.getDate();
      return this.compareValues(
        dayOfMonth,
        condition.operator,
        parseInt(condition.value),
      );
    }

    return false;
  }

  private static evaluateAccountCondition(
    condition: RuleCondition,
    context: EvaluationContext,
  ): boolean {
    const account = context.accounts.find(
      (acc) => acc.name === condition.field,
    );
    if (!account) return false;

    if (condition.operator === "exists") {
      return true;
    }

    if (condition.field === "type") {
      return this.compareValues(
        account.type,
        condition.operator,
        condition.value,
      );
    }

    if (condition.field === "currency") {
      return this.compareValues(
        account.currency,
        condition.operator,
        condition.value,
      );
    }

    return false;
  }

  private static compareValues(
    actual: any,
    operator: string,
    expected: any,
    secondaryValue?: any,
  ): boolean {
    switch (operator) {
      case "equals":
        return actual === expected;
      case "not_equals":
        return actual !== expected;
      case "greater_than":
        return Number(actual) > Number(expected);
      case "greater_than_or_equal":
        return Number(actual) >= Number(expected);
      case "less_than":
        return Number(actual) < Number(expected);
      case "less_than_or_equal":
        return Number(actual) <= Number(expected);
      case "contains":
        return String(actual)
          .toLowerCase()
          .includes(String(expected).toLowerCase());
      case "between":
        return (
          secondaryValue !== undefined &&
          actual >= expected &&
          actual <= secondaryValue
        );
      default:
        return false;
    }
  }

  private static evaluateArrayCondition(
    values: number[],
    operator: string,
    expected: number,
    secondaryValue?: number,
  ): boolean {
    const sum = values.reduce((acc, val) => acc + val, 0);
    const avg = values.length > 0 ? sum / values.length : 0;
    const max = Math.max(...values);
    const min = Math.min(...values);

    switch (operator) {
      case "equals":
        return sum === expected;
      case "greater_than":
        return sum > expected;
      case "less_than":
        return sum < expected;
      case "between":
        return (
          secondaryValue !== undefined &&
          sum >= expected &&
          sum <= secondaryValue
        );
      case "avg_greater_than":
        return avg > expected;
      case "avg_less_than":
        return avg < expected;
      case "max_greater_than":
        return max > expected;
      case "min_less_than":
        return min < expected;
      default:
        return false;
    }
  }

  private static evaluateStringCondition(
    values: (string | undefined)[],
    operator: string,
    expected: string,
  ): boolean {
    const uniqueValues = [...new Set(values.filter((v) => v !== undefined))];

    switch (operator) {
      case "contains":
        return uniqueValues.some((v) =>
          String(v).toLowerCase().includes(expected.toLowerCase()),
        );
      case "equals":
        return uniqueValues.includes(expected);
      case "not_equals":
        return !uniqueValues.includes(expected);
      default:
        return false;
    }
  }
}
