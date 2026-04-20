// Path: lib/models/Account.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IAccount extends Document {
  userId: mongoose.Types.ObjectId;
  datasetId?: mongoose.Types.ObjectId;
  name: string;
  type: "checking" | "savings" | "investment" | "credit";
  balance: number;
  currency: string;
  createdAt: Date;
}

const AccountSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    datasetId: {
      type: Schema.Types.ObjectId,
      ref: "Dataset",
      required: false,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    type: {
      type: String,
      required: true,
      enum: ["checking", "savings", "investment", "credit"],
    },
    balance: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: "GHS",
      enum: ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "GHS"],
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
AccountSchema.index({ userId: 1 });
AccountSchema.index({ datasetId: 1 });

export const Account =
  mongoose.models.Account || mongoose.model<IAccount>("Account", AccountSchema);
