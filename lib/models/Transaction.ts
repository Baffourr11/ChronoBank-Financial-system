export interface ITransaction {
  _id?: string;
  userId: string;
  datasetId?: string;
  accountId: string;
  type: "income" | "expense" | "transfer";
  category: string;
  amount: number;
  description: string;
  date: Date;
  scheduledDate?: Date;
  isRecurring: boolean;
  recurrencePattern?: "daily" | "weekly" | "monthly" | "yearly";
  status: "pending" | "completed" | "failed";
  tags: string[];
  createdAt: Date;
}
