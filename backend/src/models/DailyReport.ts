import mongoose, { Document, Schema } from 'mongoose';

export type SectionStatus = 'green' | 'yellow' | 'red';

// أقسام الريبورت الخمسة (ثابتة)
export const REPORT_SECTIONS = [
  { key: 'finance', label: 'إيرادات ومصروفات' },
  { key: 'attendance', label: 'حضور واشتراكات' },
  { key: 'maintenance', label: 'صيانة ومشاكل تقنية' },
  { key: 'incidents', label: 'شكاوى وحوادث' },
  { key: 'tasks', label: 'التاسكات' },
] as const;

export interface IReportSection {
  key: string;
  status: SectionStatus;
  text: string;
}

export interface IDailyReport extends Document {
  companyId?: mongoose.Types.ObjectId | null;
  date: Date;
  createdById: mongoose.Types.ObjectId;
  createdByName: string;
  sections: IReportSection[];
  overallStatus: SectionStatus;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const sectionSchema = new Schema<IReportSection>(
  {
    key: { type: String, required: true },
    status: { type: String, enum: ['green', 'yellow', 'red'], default: 'green' },
    text: { type: String, default: '' },
  },
  { _id: false }
);

const dailyReportSchema = new Schema<IDailyReport>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: false, default: null },
    date: { type: Date, required: true },
    createdById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdByName: { type: String, required: true },
    sections: { type: [sectionSchema], default: [] },
    overallStatus: { type: String, enum: ['green', 'yellow', 'red'], default: 'green' },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

dailyReportSchema.index({ date: -1, createdAt: -1 });

export default mongoose.model<IDailyReport>('DailyReport', dailyReportSchema);
