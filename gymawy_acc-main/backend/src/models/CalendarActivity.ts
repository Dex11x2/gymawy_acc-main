import mongoose, { Schema, Document } from 'mongoose';

export interface ICalendarActivity extends Document {
  userId?: mongoose.Types.ObjectId;
  userName: string;
  action: 'create' | 'update' | 'delete';
  targetType: 'month' | 'entry' | 'account';
  description: string; // human-readable Arabic summary
  monthId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CalendarActivitySchema = new Schema<ICalendarActivity>({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  userName: { type: String, default: '' },
  action: { type: String, enum: ['create', 'update', 'delete'], required: true },
  targetType: { type: String, enum: ['month', 'entry', 'account'], required: true },
  description: { type: String, default: '' },
  monthId: { type: Schema.Types.ObjectId, ref: 'CalendarMonth' },
}, { timestamps: true });

CalendarActivitySchema.index({ createdAt: -1 });

export default mongoose.model<ICalendarActivity>('CalendarActivity', CalendarActivitySchema);
