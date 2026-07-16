export type UserRow = {
  id: string;
  email: string;
  full_name: string;
  password_hash: string;
  preferences: {
    currency: string;
    timezone: string;
    theme: string;
  };
  created_at: string;
  updated_at: string;
};

export type DatasetRow = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  transaction_count: number;
  date_range_start: string;
  date_range_end: string;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type AccountRow = {
  id: string;
  user_id: string;
  dataset_id: string | null;
  name: string;
  type: "checking" | "savings" | "investment" | "credit";
  balance: number;
  currency: string;
  created_at: string;
  updated_at: string;
};

export type TransactionRow = {
  id: string;
  user_id: string;
  dataset_id: string | null;
  account_id: string;
  type: "income" | "expense" | "transfer";
  category: string;
  amount: number;
  description: string;
  date: string;
  scheduled_date: string | null;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  status: "pending" | "completed" | "failed";
  tags: string[];
  created_at: string;
  updated_at: string;
};

export type RuleRow = {
  id: string;
  user_id: string;
  dataset_id: string | null;
  name: string;
  description: string | null;
  is_active: boolean;
  priority: number;
  conditions: unknown[];
  actions: unknown[];
  schedule: Record<string, unknown>;
  execution_count: number;
  last_executed: string | null;
  created_at: string;
  updated_at: string;
};

export type RuleExecutionRow = {
  id: string;
  user_id: string;
  rule_id: string;
  triggered_by: string;
  conditions_met: string[];
  actions_executed: unknown[];
  status: "success" | "failed" | "partial";
  error: string | null;
  execution_time: number;
  created_at: string;
  updated_at: string;
};
