export interface IBudget {
  _id?: string;
  userId: string;
  category: string;
  limitAmount: number;
  period: "monthly" | "yearly";
  startDate: Date;
  alertThreshold: number;
  createdAt: Date;
}
