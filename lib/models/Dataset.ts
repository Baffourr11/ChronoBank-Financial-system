// Path: lib/models/Dataset.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IDataset extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  transactionCount: number;
  dateRange: {
    start: Date;
    end: Date;
  };
  isActive: boolean;
  metadata: {
    source: string; // 'upload' | 'sample' | 'import'
    format: string; // 'json' | 'excel' | 'csv'
    importedAt: Date;
    lastAnalyzed?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const DatasetSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    transactionCount: {
      type: Number,
      required: true,
      default: 0,
    },
    dateRange: {
      start: {
        type: Date,
        required: true,
      },
      end: {
        type: Date,
        required: true,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    metadata: {
      source: {
        type: String,
        required: true,
        enum: ["upload", "sample", "import"],
      },
      format: {
        type: String,
        required: true,
        enum: ["json", "excel", "csv"],
      },
      importedAt: {
        type: Date,
        default: Date.now,
      },
      lastAnalyzed: {
        type: Date,
      },
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
DatasetSchema.index({ userId: 1 });
DatasetSchema.index({ isActive: 1 });
DatasetSchema.index({ createdAt: -1 });

export const Dataset =
  mongoose.models.Dataset ||
  mongoose.model<IDataset>("Dataset", DatasetSchema);
