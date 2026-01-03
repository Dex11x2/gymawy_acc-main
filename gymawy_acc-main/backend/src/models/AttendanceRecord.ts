import mongoose, { Schema, Document } from 'mongoose';

export interface IAttendanceRecord extends Document {
  userId: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  date: Date;
  checkIn?: Date;
  checkOut?: Date;
  checkInLocation: { latitude: number; longitude: number };
  checkOutLocation?: { latitude: number; longitude: number };
  overtime: number;
  delay: number;
  leaveType?: 'annual' | 'emergency' | 'sick' | 'unpaid';
  status: 'present' | 'late' | 'absent' | 'leave';
  isManualEntry: boolean;
  verifiedByManager: boolean;
  // IP-based authentication
  authMethod?: 'location' | 'ip' | 'bypass';
  clientIP?: string;
}

const AttendanceRecordSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch' },
  date: { type: Date, required: true },
  checkIn: { type: Date },
  checkOut: { type: Date },
  checkInLocation: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  checkOutLocation: {
    latitude: { type: Number },
    longitude: { type: Number }
  },
  overtime: { type: Number, default: 0 },
  delay: { type: Number, default: 0 },
  leaveType: { type: String, enum: ['annual', 'emergency', 'sick', 'unpaid'] },
  status: { type: String, enum: ['present', 'late', 'absent', 'leave'], default: 'present' },
  isManualEntry: { type: Boolean, default: false },
  verifiedByManager: { type: Boolean, default: false },
  // IP-based authentication
  authMethod: { type: String, enum: ['location', 'ip', 'bypass'], default: 'location' },
  clientIP: { type: String }
}, { timestamps: true });

AttendanceRecordSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model<IAttendanceRecord>('AttendanceRecord', AttendanceRecordSchema);
