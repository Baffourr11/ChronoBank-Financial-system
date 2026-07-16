export interface IAlert {
  _id?: string;
  userId: string;
  type: "budget_exceeded" | "anomaly_detected" | "goal_milestone" | "low_balance";
  title: string;
  message: string;
  severity: "low" | "medium" | "high";
  isRead: boolean;
  data: Record<string, unknown>;
  createdAt: Date;
}
