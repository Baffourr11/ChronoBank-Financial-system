// Path: lib/models/Budget.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IBudget extends Document {
  userId: mongoose.Types.ObjectId;
  category: string;
  limitAmount: number;
  period: "monthly" | "yearly";
  startDate: Date;
  alertThreshold: number;
  createdAt: Date;
}

const BudgetSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    limitAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    period: {
      type: String,
      required: true,
      enum: ["monthly", "yearly"],
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    alertThreshold: {
      type: Number,
      required: true,
      default: 80,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
BudgetSchema.index({ userId: 1 });
BudgetSchema.index({ category: 1 });

export const Budget =
  mongoose.models.Budget || mongoose.model<IBudget>("Budget", BudgetSchema);
