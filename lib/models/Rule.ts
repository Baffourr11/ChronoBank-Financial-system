export interface IRule {
  _id?: string;
  userId: string;
  datasetId?: string;
  name: string;
  description: string;
  isActive: boolean;
  priority: number;
  conditions: RuleCondition[];
  actions: RuleAction[];
  schedule: RuleSchedule;
  executionCount: number;
  lastExecuted?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RuleCondition {
  type:
    | "balance"
    | "transaction"
    | "category"
    | "amount"
    | "date"
    | "account"
    | "predicted_balance"
    | "cash_flow_risk"
    | "budget";
  operator:
    | "equals"
    | "not_equals"
    | "greater_than"
    | "greater_than_or_equal"
    | "less_than"
    | "less_than_or_equal"
    | "contains"
    | "between"
    | "exists";
  field: string;
  value: unknown;
  secondaryValue?: unknown;
}

export interface RuleAction {
  type:
    | "create_transaction"
    | "send_alert"
    | "update_account"
    | "create_budget"
    | "transfer";
  params: Record<string, unknown>;
  delay?: number;
}

export interface RuleSchedule {
  type: "once" | "recurring" | "triggered";
  frequency?: "daily" | "weekly" | "monthly" | "yearly";
  time?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  timezone?: string;
}
