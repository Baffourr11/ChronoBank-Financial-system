import mongoose, { Schema, Document } from 'mongoose';

export interface IAlert extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'budget_exceeded' | 'anomaly_detected' | 'goal_milestone' | 'low_balance';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  isRead: boolean;
  data?: Record<string, any>;
  createdAt: Date;
}

const AlertSchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['budget_exceeded', 'anomaly_detected', 'goal_milestone', 'low_balance']
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  severity: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  isRead: {
    type: Boolean,
    required: true,
    default: false
  },
  data: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes
AlertSchema.index({ userId: 1 });
AlertSchema.index({ createdAt: -1 });

export const Alert = mongoose.model<IAlert>('Alert', AlertSchema);
