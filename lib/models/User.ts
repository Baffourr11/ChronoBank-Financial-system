// Path: lib/models/User.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  fullName: string;
  passwordHash: string;
  createdAt: Date;
  preferences: {
    currency: string;
    timezone: string;
    theme: string;
  };
}

const UserSchema: Schema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email format"],
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    passwordHash: {
      type: String,
      required: true,
      minlength: 6,
    },
    preferences: {
      currency: {
        type: String,
        default: "USD",
        enum: ["USD", "EUR", "GBP", "JPY", "CAD", "AUD"],
      },
      timezone: {
        type: String,
        default: "UTC",
      },
      theme: {
        type: String,
        default: "light",
        enum: ["light", "dark", "system"],
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete (ret as any).passwordHash;
        return ret;
      },
    },
  },
);

// Indexes
UserSchema.index({ email: 1 }, { unique: true });

export const User =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
