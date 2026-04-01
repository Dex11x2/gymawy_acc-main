import mongoose, { Schema, Document } from 'mongoose';

export type ReportFormat = 'pdf' | 'html' | 'both';

export interface IReportSettings extends Document {
  enabled: boolean;
  sendTime: string;
  senderEmail: string;
  senderName: string;
  reportFormat: ReportFormat;
  recipients: {
    userId: mongoose.Types.ObjectId;
    email: string;
    name: string;
    enabled: boolean;
  }[];
  reportSections: {
    attendance: boolean;
    financial: boolean;
    tasks: boolean;
    alerts: boolean;
  };
  frequency: 'daily' | 'weekly' | 'monthly';
  lastSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSettingsSchema = new Schema<IReportSettings>({
  enabled: { type: Boolean, default: true },
  sendTime: { type: String, default: '18:00' },
  senderEmail: { type: String, default: process.env.EMAIL_USER || 'Dexter11x2@gmail.com' },
  senderName: { type: String, default: 'نظام جماوي' },
  reportFormat: { type: String, enum: ['pdf', 'html', 'both'], default: 'both' },
  recipients: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    email: { type: String, required: true },
    name: { type: String, required: true },
    enabled: { type: Boolean, default: true }
  }],
  reportSections: {
    attendance: { type: Boolean, default: true },
    financial: { type: Boolean, default: true },
    tasks: { type: Boolean, default: true },
    alerts: { type: Boolean, default: true }
  },
  frequency: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'daily' },
  lastSentAt: { type: Date }
}, { timestamps: true })

export default mongoose.model<IReportSettings>('ReportSettings', ReportSettingsSchema);
