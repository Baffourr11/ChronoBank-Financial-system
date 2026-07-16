export interface IRuleExecution {
  _id?: string;
  userId: string;
  ruleId: string;
  triggeredBy: string;
  conditionsMet: string[];
  actionsExecuted: RuleExecutionAction[];
  status: "success" | "failed" | "partial";
  error?: string;
  executionTime: number;
  createdAt: Date;
}

export interface RuleExecutionAction {
  type: string;
  status: "success" | "failed";
  result?: unknown;
  error?: string;
  duration?: number;
}
