import mongoose, { Document, Schema } from 'mongoose';

// سجل إرسال التقرير المالي للمدراء (مين بعت أنهي شهر وإمتا)
export interface IFinancialReportSend extends Document {
  month: number;
  year: number;
  sentById: mongoose.Types.ObjectId;
  sentByName: string;
  note?: string;
  summary?: string;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IFinancialReportSend>(
  {
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    sentById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sentByName: { type: String, required: true },
    note: { type: String, default: '' },
    summary: { type: String, default: '' },
  },
  { timestamps: true }
);

schema.index({ year: -1, month: -1, createdAt: -1 });

export default mongoose.model<IFinancialReportSend>('FinancialReportSend', schema);
