export interface IAccount {
  _id?: string;
  userId: string;
  datasetId?: string;
  name: string;
  type: "checking" | "savings" | "investment" | "credit";
  balance: number;
  currency: string;
  createdAt: Date;
}
