// Path: lib/models/RuleExecution.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IRuleExecution extends Document {
  userId: mongoose.Types.ObjectId;
  ruleId: mongoose.Types.ObjectId;
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
  result?: any;
  error?: string;
  duration: number;
}

const RuleExecutionActionSchema = new Schema({
  type: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: ["success", "failed"],
  },
  result: {
    type: Schema.Types.Mixed,
  },
  error: {
    type: String,
  },
  duration: {
    type: Number,
    required: true,
    min: 0,
  },
});

const RuleExecutionSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    ruleId: {
      type: Schema.Types.ObjectId,
      ref: "Rule",
      required: true,
    },
    triggeredBy: {
      type: String,
      required: true,
      trim: true,
    },
    conditionsMet: [
      {
        type: String,
        trim: true,
      },
    ],
    actionsExecuted: [RuleExecutionActionSchema],
    status: {
      type: String,
      required: true,
      enum: ["success", "failed", "partial"],
      default: "success",
    },
    error: {
      type: String,
      trim: true,
    },
    executionTime: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
RuleExecutionSchema.index({ userId: 1 });
RuleExecutionSchema.index({ ruleId: 1 });
RuleExecutionSchema.index({ createdAt: -1 });
RuleExecutionSchema.index({ status: 1 });

export const RuleExecution =
  mongoose.models.RuleExecution ||
  mongoose.model<IRuleExecution>("RuleExecution", RuleExecutionSchema);
