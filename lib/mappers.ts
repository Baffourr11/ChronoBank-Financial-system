import type { IAccount } from "@/lib/models/Account";
import type { ITransaction } from "@/lib/models/Transaction";
import type { IDataset } from "@/lib/models/Dataset";
import type { IRule } from "@/lib/models/Rule";
import type {
  AccountRow,
  DatasetRow,
  RuleRow,
  TransactionRow,
} from "@/lib/supabase/types";

export function toITransaction(row: TransactionRow): ITransaction {
  return {
    _id: row.id,
    userId: row.user_id,
    datasetId: row.dataset_id ?? undefined,
    accountId: row.account_id,
    type: row.type,
    category: row.category,
    amount: Number(row.amount),
    description: row.description,
    date: new Date(row.date),
    scheduledDate: row.scheduled_date ? new Date(row.scheduled_date) : undefined,
    isRecurring: row.is_recurring,
    recurrencePattern: row.recurrence_pattern as ITransaction["recurrencePattern"],
    status: row.status,
    tags: row.tags ?? [],
    createdAt: new Date(row.created_at),
  };
}

export function toIAccount(row: AccountRow): IAccount {
  return {
    _id: row.id,
    userId: row.user_id,
    datasetId: row.dataset_id ?? undefined,
    name: row.name,
    type: row.type,
    balance: Number(row.balance),
    currency: row.currency,
    createdAt: new Date(row.created_at),
  };
}

export function toIDataset(row: DatasetRow): IDataset {
  return {
    _id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description ?? undefined,
    transactionCount: row.transaction_count,
    dateRange: {
      start: new Date(row.date_range_start),
      end: new Date(row.date_range_end),
    },
    isActive: row.is_active,
    metadata: row.metadata as IDataset["metadata"],
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function toIRule(row: RuleRow): IRule {
  return {
    _id: row.id,
    userId: row.user_id,
    datasetId: row.dataset_id ?? undefined,
    name: row.name,
    description: row.description ?? "",
    isActive: row.is_active,
    priority: row.priority,
    conditions: row.conditions as IRule["conditions"],
    actions: row.actions as IRule["actions"],
    schedule: row.schedule as IRule["schedule"],
    executionCount: row.execution_count,
    lastExecuted: row.last_executed ? new Date(row.last_executed) : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}
