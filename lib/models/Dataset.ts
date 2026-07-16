export interface IDataset {
  _id?: string;
  userId: string;
  name: string;
  description?: string;
  transactionCount: number;
  dateRange: {
    start: Date;
    end: Date;
  };
  isActive: boolean;
  metadata: {
    source: string;
    format: string;
    importedAt: Date;
    lastAnalyzed?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}
