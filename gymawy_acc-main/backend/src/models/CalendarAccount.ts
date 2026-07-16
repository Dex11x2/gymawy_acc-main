import mongoose, { Schema, Document } from 'mongoose';

export interface ICalendarAccount extends Document {
  key: string;      // stable slug stored on entries (e.g. 'gymawya' or 'acc_...')
  name: string;
  color: string;    // hex
  order: number;
  isActive: boolean;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CalendarAccountSchema = new Schema<ICalendarAccount>({
  key: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  color: { type: String, default: '#3B82F6' },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

CalendarAccountSchema.index({ order: 1 });

export default mongoose.model<ICalendarAccount>('CalendarAccount', CalendarAccountSchema);
