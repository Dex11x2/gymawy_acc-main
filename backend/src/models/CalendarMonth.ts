import mongoose, { Schema, Document } from 'mongoose';

export interface ICalendarMonth extends Document {
  companyId?: mongoose.Types.ObjectId;
  ownerId?: mongoose.Types.ObjectId; // manager/owner whose workspace this belongs to
  month: number; // 1-12
  year: number;
  title: string; // e.g. "8 - 2026"
  iconColor: string; // hex color for the page icon square
  status: 'active' | 'done';
  order: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CalendarMonthSchema = new Schema<ICalendarMonth>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User' },
  month: { type: Number, required: true, min: 1, max: 12 },
  year: { type: Number, required: true },
  title: { type: String, required: true },
  iconColor: { type: String, default: '#3B82F6' },
  status: { type: String, enum: ['active', 'done'], default: 'active' },
  order: { type: Number, default: 0 },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

CalendarMonthSchema.index({ year: 1, month: 1 });
CalendarMonthSchema.index({ status: 1, order: 1 });

export default mongoose.model<ICalendarMonth>('CalendarMonth', CalendarMonthSchema);
