import mongoose, { Schema, Document } from 'mongoose';

export interface IReportLog extends Document {
  recipientEmail: string;
  recipientName: string;
  status: 'success' | 'failed';
  errorMessage?: string;
  sentAt: Date;
  reportType: 'scheduled' | 'immediate' | 'test';
}

const ReportLogSchema = new Schema({
  recipientEmail: { type: String, required: true },
  recipientName: { type: String, required: true },
  status: { type: String, enum: ['success', 'failed'], required: true },
  errorMessage: { type: String },
  sentAt: { type: Date, default: Date.now },
  reportType: { type: String, enum: ['scheduled', 'immediate', 'test'], default: 'scheduled' }
}, {
  timestamps: true
});

// Index للبحث السريع
ReportLogSchema.index({ sentAt: -1 });
ReportLogSchema.index({ recipientEmail: 1 });

export default mongoose.model<IReportLog>('ReportLog', ReportLogSchema);
