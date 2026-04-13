import { RuleAction, RuleExecutionAction } from '../models/Rule';
import { connectToDatabase } from '../db';
import { Transaction, Account, Budget, Alert } from '../models';
import { getCurrentUser } from '../auth';

export class ActionExecutor {
  static async executeActions(
    actions: RuleAction[],
    userId: string,
    context: any
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
          status: 'success',
          result,
          duration: Date.now() - startTime
        });
      } catch (error) {
        results.push({
          type: action.type,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          duration: Date.now() - startTime
        });
      }
    }

    return results;
  }

  private static async executeAction(
    action: RuleAction,
    userId: string,
    context: any
  ): Promise<any> {
    switch (action.type) {
      case 'create_transaction':
        return this.createTransaction(action.params, userId);
      case 'send_alert':
        return this.sendAlert(action.params, userId);
      case 'update_account':
        return this.updateAccount(action.params, userId);
      case 'create_budget':
        return this.createBudget(action.params, userId);
      case 'transfer':
        return this.transferFunds(action.params, userId);
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  private static async createTransaction(params: any, userId: string) {
    await connectToDatabase();
    
    const {
      accountId,
      type,
      category,
      amount,
      description,
      date = new Date(),
      isRecurring = false,
      recurrencePattern
    } = params;

    const account = await Account.findById(accountId);
    if (!account || account.userId.toString() !== userId) {
      throw new Error('Account not found or unauthorized');
    }

    const transaction = await Transaction.create({
      userId,
      accountId,
      type,
      category,
      amount: parseFloat(amount),
      description: description || `Auto-created by rule: ${type} in ${category}`,
      date: new Date(date),
      isRecurring,
      recurrencePattern,
      status: 'completed'
    });

    // Update account balance
    if (type === 'income') {
      account.balance += amount;
    } else if (type === 'expense') {
      account.balance -= amount;
    }
    await account.save();

    return {
      transactionId: transaction._id,
      newBalance: account.balance,
      message: `Created ${type} transaction of ${amount} in ${category}`
    };
  }

  private static async sendAlert(params: any, userId: string) {
    await connectToDatabase();
    
    const { type, title, message, severity = 'medium', data = {} } = params;

    const alert = await Alert.create({
      userId,
      type,
      title,
      message,
      severity,
      data,
      isRead: false
    });

    return {
      alertId: alert._id,
      message: `Alert created: ${title}`
    };
  }

  private static async updateAccount(params: any, userId: string) {
    await connectToDatabase();
    
    const { accountId, updates } = params;

    const account = await Account.findById(accountId);
    if (!account || account.userId.toString() !== userId) {
      throw new Error('Account not found or unauthorized');
    }

    // Apply updates
    if (updates.balance !== undefined) {
      account.balance = parseFloat(updates.balance);
    }
    if (updates.name) {
      account.name = updates.name;
    }
    if (updates.type) {
      account.type = updates.type;
    }
    if (updates.currency) {
      account.currency = updates.currency;
    }

    await account.save();

    return {
      accountId: account._id,
      updatedFields: Object.keys(updates),
      message: `Account ${account.name} updated`
    };
  }

  private static async createBudget(params: any, userId: string) {
    await connectToDatabase();
    
    const {
      category,
      limitAmount,
      period = 'monthly',
      startDate = new Date(),
      alertThreshold = 80
    } = params;

    // Check if budget already exists for this category
    const existingBudget = await Budget.findOne({
      userId,
      category,
      period
    });

    if (existingBudget) {
      // Update existing budget
      existingBudget.limitAmount = parseFloat(limitAmount);
      existingBudget.startDate = new Date(startDate);
      existingBudget.alertThreshold = parseFloat(alertThreshold);
      await existingBudget.save();

      return {
        budgetId: existingBudget._id,
        action: 'updated',
        message: `Budget for ${category} updated to ${limitAmount}`
      };
    }

    const budget = await Budget.create({
      userId,
      category,
      limitAmount: parseFloat(limitAmount),
      period,
      startDate: new Date(startDate),
      alertThreshold: parseFloat(alertThreshold)
    });

    return {
      budgetId: budget._id,
      action: 'created',
      message: `Budget for ${category} created with limit ${limitAmount}`
    };
  }

  private static async transferFunds(params: any, userId: string) {
    await connectToDatabase();
    
    const { fromAccountId, toAccountId, amount, description } = params;

    const fromAccount = await Account.findById(fromAccountId);
    const toAccount = await Account.findById(toAccountId);

    if (!fromAccount || !toAccount) {
      throw new Error('One or both accounts not found');
    }

    if (fromAccount.userId.toString() !== userId || toAccount.userId.toString() !== userId) {
      throw new Error('Unauthorized account access');
    }

    const transferAmount = parseFloat(amount);
    if (fromAccount.balance < transferAmount) {
      throw new Error('Insufficient funds in source account');
    }

    // Update balances
    fromAccount.balance -= transferAmount;
    toAccount.balance += transferAmount;

    await fromAccount.save();
    await toAccount.save();

    // Create transfer transaction
    const transaction = await Transaction.create({
      userId,
      accountId: fromAccountId,
      type: 'transfer',
      category: 'Transfer',
      amount: transferAmount,
      description: description || `Transfer to ${toAccount.name}`,
      date: new Date(),
      status: 'completed',
      tags: ['transfer', toAccount.name]
    });

    return {
      transactionId: transaction._id,
      fromAccountBalance: fromAccount.balance,
      toAccountBalance: toAccount.balance,
      message: `Transferred ${amount} from ${fromAccount.name} to ${toAccount.name}`
    };
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
