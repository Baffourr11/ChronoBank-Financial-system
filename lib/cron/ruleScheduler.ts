import { RuleEngine } from '../rules/RuleEngine';
import { connectToDatabase } from '../db';

// This would be called by a cron job service (like Vercel Cron Jobs, node-cron, etc.)
export async function processScheduledRules() {
  try {
    console.log('Processing scheduled rules...');
    await connectToDatabase();
    
    // Process all scheduled rules
    await RuleEngine.processScheduledRules();
    
    console.log('Scheduled rules processed successfully');
  } catch (error) {
    console.error('Error processing scheduled rules:', error);
  }
}

// Process rules triggered by transactions (called from transaction creation/update)
export async function processTransactionRules(userId: string, transactionData: any) {
  try {
    await connectToDatabase();
    
    // Trigger rule processing for transaction events
    await RuleEngine.processRules(userId, {
      type: 'transaction',
      transaction: transactionData
    });
    
  } catch (error) {
    console.error('Error processing transaction rules:', error);
  }
}

// Process rules triggered by account changes
export async function processAccountRules(userId: string, accountData: any) {
  try {
    await connectToDatabase();
    
    // Trigger rule processing for account events
    await RuleEngine.processRules(userId, {
      type: 'account',
      account: accountData
    });
    
  } catch (error) {
    console.error('Error processing account rules:', error);
  }
}
