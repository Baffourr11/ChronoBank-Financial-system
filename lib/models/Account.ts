// Path: lib/models/Account.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IAccount extends Document {
  userId: mongoose.Types.ObjectId;
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
      default: "USD",
      enum: ["USD", "EUR", "GBP", "JPY", "CAD", "AUD"],
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
AccountSchema.index({ userId: 1 });

export const Account =
  mongoose.models.Account || mongoose.model<IAccount>("Account", AccountSchema);
