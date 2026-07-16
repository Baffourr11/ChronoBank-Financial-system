import type { IRule } from "@/lib/models/Rule";

export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  category: "ghana" | "general";
  rule: Omit<
    IRule,
    "_id" | "userId" | "executionCount" | "lastExecuted" | "createdAt" | "updatedAt"
  >;
}

export const THESIS_RULE_TEMPLATES: RuleTemplate[] = [
  {
    id: "momo-shortage-7d",
    name: "MoMo shortage warning (7 days)",
    description:
      "Alert when forecast shows wallet balance may drop below threshold within 7 days.",
    category: "ghana",
    rule: {
      name: "MoMo shortage warning (7 days)",
      description: "Predicted low balance within 7 days",
      isActive: true,
      priority: 9,
      conditions: [
        {
          type: "predicted_balance",
          operator: "less_than",
          field: "7d",
          value: 500,
        },
      ],
      actions: [
        {
          type: "send_alert",
          params: {
            title: "MoMo balance risk",
            message:
              "Your MoMo wallet may drop below GHS 500 within 7 days. Delay non-urgent spending and check incoming payments.",
            severity: "high",
            type: "cash_flow_risk",
          },
        },
      ],
      schedule: { type: "triggered" },
    },
  },
  {
    id: "low-balance-now",
    name: "Low balance alert (now)",
    description: "Immediate alert when any account balance is below threshold.",
    category: "ghana",
    rule: {
      name: "Low balance alert",
      description: "Current balance below safe level",
      isActive: true,
      priority: 8,
      conditions: [
        {
          type: "balance",
          operator: "less_than",
          field: "Main MoMo",
          value: 1000,
        },
      ],
      actions: [
        {
          type: "send_alert",
          params: {
            title: "Low balance",
            message: "Account balance is below your safe threshold.",
            severity: "high",
          },
        },
      ],
      schedule: { type: "triggered" },
    },
  },
  {
    id: "cash-flow-risk-high",
    name: "High cash-flow risk",
    description: "Alert when intelligence detects high shortage risk.",
    category: "ghana",
    rule: {
      name: "High cash-flow risk",
      description: "Forecast risk severity is high",
      isActive: true,
      priority: 9,
      conditions: [
        {
          type: "cash_flow_risk",
          operator: "equals",
          field: "severity",
          value: "high",
        },
      ],
      actions: [
        {
          type: "send_alert",
          params: {
            title: "Cash-flow risk",
            message:
              "High risk of cash shortage detected. Review upcoming expenses and supplier payments.",
            severity: "high",
          },
        },
      ],
      schedule: { type: "triggered" },
    },
  },
  {
    id: "month-end-reserve",
    name: "Month-end balance check",
    description: "Daily check near month-end for low balances.",
    category: "ghana",
    rule: {
      name: "Month-end balance check",
      description: "Recurring check before month-end obligations",
      isActive: true,
      priority: 7,
      conditions: [
        {
          type: "date",
          operator: "greater_than",
          field: "day_of_month",
          value: 25,
        },
        {
          type: "balance",
          operator: "less_than",
          field: "Main MoMo",
          value: 2000,
        },
      ],
      actions: [
        {
          type: "send_alert",
          params: {
            title: "Month-end liquidity warning",
            message:
              "Balance is low before month-end. Prioritize essential stock and supplier payments.",
            severity: "medium",
          },
        },
      ],
      schedule: {
        type: "recurring",
        frequency: "daily",
        time: "08:00",
      },
    },
  },
  {
    id: "budget-at-or-over-100",
    name: "Budget at or over 100%",
    description:
      "Alert when any category reaches 100% or more of its monthly budget.",
    category: "general",
    rule: {
      name: "Budget at or over 100%",
      description: "Notify when monthly budget limit is reached",
      isActive: true,
      priority: 8,
      conditions: [
        {
          type: "budget",
          operator: "greater_than_or_equal",
          field: "*",
          value: 100,
        },
      ],
      actions: [
        {
          type: "send_alert",
          params: {
            type: "budget_exceeded",
            title: "Budget limit reached",
            message:
              "A category has reached or exceeded its monthly budget. Tap to view transactions.",
            severity: "high",
          },
        },
      ],
      schedule: { type: "triggered" },
    },
  },
  {
    id: "large-expense",
    name: "Large expense alert",
    description: "Alert on unusually large outgoing transactions.",
    category: "general",
    rule: {
      name: "Large expense alert",
      description: "Transaction amount exceeds threshold",
      isActive: true,
      priority: 6,
      conditions: [
        {
          type: "transaction",
          operator: "greater_than",
          field: "amount",
          value: 500,
        },
        {
          type: "transaction",
          operator: "equals",
          field: "type",
          value: "expense",
        },
      ],
      actions: [
        {
          type: "send_alert",
          params: {
            type: "large_expense",
            title: "Large expense recorded",
            message: "A large expense was recorded on your account.",
            severity: "medium",
          },
        },
      ],
      schedule: { type: "triggered" },
    },
  },
  {
    id: "tax-reserve",
    name: "Tax reserve (generic)",
    description: "Reserve portion of income for taxes.",
    category: "general",
    rule: {
      name: "Tax Reserve Automation",
      description: "Alert on large income for tax planning",
      isActive: true,
      priority: 8,
      conditions: [
        {
          type: "transaction",
          operator: "greater_than",
          field: "amount",
          value: 1000,
        },
        {
          type: "transaction",
          operator: "equals",
          field: "type",
          value: "income",
        },
      ],
      actions: [
        {
          type: "send_alert",
          params: {
            title: "Tax reserve reminder",
            message: "Large income received — consider setting aside tax reserve.",
            severity: "low",
          },
        },
      ],
      schedule: { type: "triggered" },
    },
  },
];
