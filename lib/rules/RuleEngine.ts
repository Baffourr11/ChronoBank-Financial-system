// Path: lib/rules/RuleEngine.ts
import { Rule, IRule, RuleCondition, RuleAction } from "../models/Rule";
import { RuleExecution } from "../models/RuleExecution";
import { Transaction, Account, Budget } from "../models";
import { ConditionEvaluator, EvaluationContext } from "./ConditionEvaluator";
import { ActionExecutor } from "./ActionExecutor";
import { connectToDatabase } from "../db";

export class RuleEngine {
  static async processRules(userId: string, triggerData?: any): Promise<void> {
    try {
      await connectToDatabase();

      // Get all active rules for the user
      const rules = await Rule.find({
        userId,
        isActive: true,
      }).sort({ priority: 1 });

      // Get current context data
      const context = await this.buildEvaluationContext(userId, triggerData);

      // Process each rule
      for (const rule of rules) {
        await this.processRule(rule, context, triggerData);
      }
    } catch (error) {
      console.error("Error processing rules:", error);
    }
  }

  static async processScheduledRules(): Promise<void> {
    try {
      await connectToDatabase();

      const now = new Date();
      const scheduledRules = await Rule.find({
        isActive: true,
        "schedule.type": { $in: ["once", "recurring"] },
      });

      for (const rule of scheduledRules) {
        if (this.shouldExecuteScheduledRule(rule, now)) {
          const context = await this.buildEvaluationContext(
            rule.userId.toString(),
          );
          await this.processRule(rule, context, {
            type: "scheduled",
            time: now,
          });
        }
      }
    } catch (error) {
      console.error("Error processing scheduled rules:", error);
    }
  }

  private static async processRule(
    rule: IRule,
    context: EvaluationContext,
    triggerData?: any,
  ): Promise<void> {
    const startTime = Date.now();
    let executionStatus: "success" | "failed" | "partial" = "success";
    let errorMessage: string | undefined;
    let actionsExecuted: any[] = [];

    try {
      // Evaluate conditions
      const result = ConditionEvaluator.evaluateAllConditions(
        rule.conditions,
        context,
      );

      if (result.met) {
        // Execute actions
        actionsExecuted = await ActionExecutor.executeActions(
          rule.actions,
          rule.userId.toString(),
          context,
        );

        // Check if any actions failed
        const failedActions = actionsExecuted.filter(
          (action) => action.status === "failed",
        );
        if (failedActions.length > 0) {
          executionStatus =
            failedActions.length === rule.actions.length ? "failed" : "partial";
        }

        // Update rule execution count and last executed
        rule.executionCount += 1;
        rule.lastExecuted = new Date();
        await rule.save();
      }

      // Log execution
      await this.logRuleExecution({
        userId: rule.userId.toString(),
        ruleId: rule._id.toString(),
        triggeredBy: triggerData?.type || "manual",
        conditionsMet: result.metConditions || [],
        actionsExecuted,
        status: executionStatus,
        error: errorMessage,
        executionTime: Date.now() - startTime,
      });
    } catch (error) {
      executionStatus = "failed";
      errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Log execution even on error
      await this.logRuleExecution({
        userId: rule.userId.toString(),
        ruleId: rule._id.toString(),
        triggeredBy: triggerData?.type || "manual",
        conditionsMet: [],
        actionsExecuted,
        status: executionStatus,
        error: errorMessage,
        executionTime: Date.now() - startTime,
      });
    }
  }

  private static async buildEvaluationContext(
    userId: string,
    triggerData?: any,
  ): Promise<EvaluationContext> {
    const [transactions, accounts, budgets] = await Promise.all([
      Transaction.find({ userId }).sort({ date: -1 }).limit(1000),
      Account.find({ userId }),
      Budget.find({ userId }),
    ]);

    return {
      transactions,
      accounts,
      budgets,
      currentDate: new Date(),
      triggerData,
    };
  }

  private static shouldExecuteScheduledRule(rule: IRule, now: Date): boolean {
    const { schedule, lastExecuted } = rule;

    if (schedule.type === "once") {
      // For one-time rules, check if it hasn't been executed yet
      if (lastExecuted) return false;

      // Check if scheduled time has passed
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

  private static async logRuleExecution(executionData: {
    userId: string;
    ruleId: string;
    triggeredBy: string;
    conditionsMet: string[];
    actionsExecuted: any[];
    status: "success" | "failed" | "partial";
    error?: string;
    executionTime: number;
  }): Promise<void> {
    try {
      await RuleExecution.create({
        ...executionData,
        createdAt: new Date(),
      });
    } catch (error) {
      console.error("Error logging rule execution:", error);
    }
  }

  // Utility methods for creating common rule templates
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
            accountId: null, // Will be set by user
            type: "expense",
            category: "Taxes",
            amount: 0, // Will be calculated dynamically
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
            fromAccountId: null, // Will be set by user
            toAccountId: null, // Will be set by user
            amount: 0, // Will be calculated dynamically
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
