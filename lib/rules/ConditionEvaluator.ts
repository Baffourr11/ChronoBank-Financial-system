// Path: lib/rules/ConditionEvaluator.ts
import { RuleCondition } from "../models/Rule";
// Note: ITransaction, IAccount, IBudget models removed - only core Rule functionality remains

export interface EvaluationContext {
  transactions: any[]; // Empty array since Transaction model removed
  accounts: any[]; // Empty array since Account model removed
  budgets: any[]; // Empty array since Budget model removed
  currentDate: Date;
  triggerData?: any;
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
      default:
        return false;
    }
  }

  static evaluateAllConditions(
    conditions: RuleCondition[],
    context: EvaluationContext,
  ): { met: boolean; metConditions: string[] } {
    const metConditions: string[] = [];

    for (const condition of conditions) {
      const isMet = this.evaluateCondition(condition, context);
      if (isMet) {
        metConditions.push(
          `${condition.type} ${condition.operator} ${condition.value}`,
        );
      } else {
        return { met: false, metConditions };
      }
    }

    return { met: true, metConditions };
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
    // Since transactions array is empty (model removed), evaluate based on trigger data if available
    if (context.triggerData && context.triggerData.type === "transaction") {
      const transaction = context.triggerData;

      if (condition.field === "amount") {
        return this.evaluateArrayCondition(
          [transaction.amount],
          condition.operator,
          condition.value,
          condition.secondaryValue,
        );
      }

      if (condition.field === "category" || condition.field === "description") {
        const value = transaction[condition.field];
        return this.evaluateStringCondition(
          [value],
          condition.operator,
          condition.value,
        );
      }
    }

    return false;
  }

  private static evaluateCategoryCondition(
    condition: RuleCondition,
    context: EvaluationContext,
  ): boolean {
    // Since transactions array is empty (model removed), evaluate based on trigger data if available
    if (
      context.triggerData &&
      context.triggerData.type === "transaction" &&
      context.triggerData.category
    ) {
      const category = context.triggerData.category;
      return this.evaluateStringCondition(
        [category],
        condition.operator,
        condition.value,
      );
    }

    return false;
  }

  private static evaluateAmountCondition(
    condition: RuleCondition,
    context: EvaluationContext,
  ): boolean {
    // Since transactions array is empty (model removed), evaluate based on trigger data if available
    if (
      context.triggerData &&
      context.triggerData.type === "transaction" &&
      context.triggerData.amount
    ) {
      const amount = context.triggerData.amount;
      return this.evaluateArrayCondition(
        [amount],
        condition.operator,
        condition.value,
      );
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
        return actual > expected;
      case "less_than":
        return actual < expected;
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
