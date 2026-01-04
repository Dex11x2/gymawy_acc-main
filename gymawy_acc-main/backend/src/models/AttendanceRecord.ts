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
  // Authentication method with priority (manual > location > ip > bypass)
  // manual: Admin entry (highest priority, can override all)
  // location: GPS-based check-in
  // ip: WiFi/IP-based check-in
  // bypass: Selfie verification (lowest priority)
  authMethod?: 'manual' | 'location' | 'ip' | 'bypass';
  clientIP?: string;
  // Who modified the record (for manual entries)
  modifiedBy?: mongoose.Types.ObjectId;
  // Selfie verification for bypass mode
  selfiePhoto?: string; // Base64 or file path
  selfieTimestamp?: Date; // Timestamp from EXIF metadata
  selfieDeviceInfo?: string; // Device info from EXIF
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
  // Authentication method with priority (manual > location > ip > bypass)
  authMethod: { type: String, enum: ['manual', 'location', 'ip', 'bypass'], default: 'location' },
  clientIP: { type: String },
  modifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  // Selfie verification for bypass mode
  selfiePhoto: { type: String },
  selfieTimestamp: { type: Date },
  selfieDeviceInfo: { type: String }
}, { timestamps: true });

AttendanceRecordSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model<IAttendanceRecord>('AttendanceRecord', AttendanceRecordSchema);
