import mongoose, { Schema, Document } from 'mongoose';

export interface IDailyAttendance extends Document {
  employeeId: mongoose.Types.ObjectId;
  date: Date;
  checkIn?: Date;
  checkOut?: Date;
  status: 'present' | 'absent' | 'leave' | 'permission' | 'late';
  lateMinutes?: number;
  earlyLeaveMinutes?: number;
  workHours?: number;
  notes?: string;
  leaveType?: 'sick' | 'annual' | 'emergency' | 'unpaid';
  permissionHours?: number;
}

const DailyAttendanceSchema = new Schema({
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  date: { type: Date, required: true },
  checkIn: { type: Date },
  checkOut: { type: Date },
  status: { 
    type: String, 
    enum: ['present', 'absent', 'leave', 'permission', 'late'],
    default: 'absent'
  },
  lateMinutes: { type: Number, default: 0 },
  earlyLeaveMinutes: { type: Number, default: 0 },
  workHours: { type: Number, default: 0 },
  notes: { type: String },
  leaveType: { type: String, enum: ['sick', 'annual', 'emergency', 'unpaid'] },
  permissionHours: { type: Number }
}, { timestamps: true });

// Index for faster queries
DailyAttendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

export default mongoose.model<IDailyAttendance>('DailyAttendance', DailyAttendanceSchema);
