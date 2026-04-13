// Path: lib/models/Rule.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IRule extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  isActive: boolean;
  priority: number;
  conditions: RuleCondition[];
  actions: RuleAction[];
  schedule: RuleSchedule;
  executionCount: number;
  lastExecuted?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RuleCondition {
  type: "balance" | "transaction" | "category" | "amount" | "date" | "account";
  operator:
    | "equals"
    | "not_equals"
    | "greater_than"
    | "less_than"
    | "contains"
    | "between"
    | "exists";
  field: string;
  value: any;
  secondaryValue?: any; // For 'between' operator
}

export interface RuleAction {
  type:
    | "create_transaction"
    | "send_alert"
    | "update_account"
    | "create_budget"
    | "transfer";
  params: Record<string, any>;
  delay?: number; // Delay in minutes
}

export interface RuleSchedule {
  type: "once" | "recurring" | "triggered";
  frequency?: "daily" | "weekly" | "monthly" | "yearly";
  time?: string; // HH:MM format
  dayOfWeek?: number; // 0-6 (Sunday-Saturday)
  dayOfMonth?: number; // 1-31
  timezone?: string;
}

const RuleConditionSchema = new Schema({
  type: {
    type: String,
    required: true,
    enum: ["balance", "transaction", "category", "amount", "date", "account"],
  },
  operator: {
    type: String,
    required: true,
    enum: [
      "equals",
      "not_equals",
      "greater_than",
      "less_than",
      "contains",
      "between",
      "exists",
    ],
  },
  field: {
    type: String,
    required: true,
    trim: true,
  },
  value: {
    type: Schema.Types.Mixed,
    required: function (this: any) {
      return this.operator !== "exists";
    },
  },
  secondaryValue: {
    type: Schema.Types.Mixed,
  },
});

const RuleActionSchema = new Schema({
  type: {
    type: String,
    required: true,
    enum: [
      "create_transaction",
      "send_alert",
      "update_account",
      "create_budget",
      "transfer",
    ],
  },
  params: {
    type: Schema.Types.Mixed,
    required: true,
    default: {},
  },
  delay: {
    type: Number,
    min: 0,
    default: 0,
  },
});

const RuleScheduleSchema = new Schema({
  type: {
    type: String,
    required: true,
    enum: ["once", "recurring", "triggered"],
    default: "triggered",
  },
  frequency: {
    type: String,
    enum: ["daily", "weekly", "monthly", "yearly"],
  },
  time: {
    type: String,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
  },
  dayOfWeek: {
    type: Number,
    min: 0,
    max: 6,
  },
  dayOfMonth: {
    type: Number,
    min: 1,
    max: 31,
  },
  timezone: {
    type: String,
    default: "UTC",
  },
});

const RuleSchema: Schema = new Schema(
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
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    priority: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
      default: 5,
    },
    conditions: [RuleConditionSchema],
    actions: [RuleActionSchema],
    schedule: RuleScheduleSchema,
    executionCount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    lastExecuted: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
RuleSchema.index({ userId: 1 });
RuleSchema.index({ isActive: 1 });
RuleSchema.index({ "schedule.type": 1 });
RuleSchema.index({ priority: 1 });

export const Rule = mongoose.model<IRule>("Rule", RuleSchema);
