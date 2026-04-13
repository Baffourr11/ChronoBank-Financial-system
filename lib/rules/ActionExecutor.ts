// Path: lib/rules/ActionExecutor.ts
import { RuleAction } from "../models/Rule";
import { RuleExecutionAction } from "../models/RuleExecution";
// Note: Transaction, Account, Budget, Alert models removed - only core Rule functionality remains

export class ActionExecutor {
  static async executeActions(
    actions: RuleAction[],
    userId: string,
    context: any,
  ): Promise<RuleExecutionAction[]> {
    const results: RuleExecutionAction[] = [];

    for (const action of actions) {
      const startTime = Date.now();

      try {
        if (action.delay && action.delay > 0) {
          await this.delay(action.delay * 60 * 1000); // Convert minutes to milliseconds
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
    context: any,
  ): Promise<any> {
    switch (action.type) {
      case "create_transaction":
        return this.createTransaction(action.params, userId);
      case "send_alert":
        return this.sendAlert(action.params, userId);
      case "update_account":
        return this.updateAccount(action.params, userId);
      case "create_budget":
        return this.createBudget(action.params, userId);
      case "transfer":
        return this.transferFunds(action.params, userId);
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  private static async createTransaction(params: any, userId: string) {
    // Since Transaction and Account models are removed, just log the action
    const { type, category, amount, description } = params;

    console.log(
      `Rule action: Create ${type} transaction of ${amount} in ${category}`,
    );

    return {
      message: `Transaction creation logged: ${type} of ${amount} in ${category}`,
      note: "Transaction model removed - action logged only",
    };
  }

  private static async sendAlert(params: any, userId: string) {
    // Since Alert model is removed, just log the action
    const { type, title, message, severity = "medium" } = params;

    console.log(`Rule action: Send alert - ${title}: ${message}`);

    return {
      message: `Alert logged: ${title}`,
      note: "Alert model removed - action logged only",
    };
  }

  private static async updateAccount(params: any, userId: string) {
    // Since Account model is removed, just log the action
    const { accountId, updates } = params;

    console.log(
      `Rule action: Update account ${accountId} with:`,
      Object.keys(updates),
    );

    return {
      message: `Account update logged for ${accountId}`,
      note: "Account model removed - action logged only",
    };
  }

  private static async createBudget(params: any, userId: string) {
    // Since Budget model is removed, just log the action
    const { category, limitAmount, period = "monthly" } = params;

    console.log(
      `Rule action: Create budget for ${category} with limit ${limitAmount}`,
    );

    return {
      message: `Budget creation logged for ${category}`,
      note: "Budget model removed - action logged only",
    };
  }

  private static async transferFunds(params: any, userId: string) {
    // Since Account and Transaction models are removed, just log the action
    const { fromAccountId, toAccountId, amount, description } = params;

    console.log(
      `Rule action: Transfer ${amount} from ${fromAccountId} to ${toAccountId}`,
    );

    return {
      message: `Transfer logged: ${amount} from ${fromAccountId} to ${toAccountId}`,
      note: "Account and Transaction models removed - action logged only",
    };
  }

  private static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
