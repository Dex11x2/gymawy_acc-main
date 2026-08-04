import mongoose, { Schema, Document } from 'mongoose';

export interface IAttendanceSystem extends Document {
  employeeId: mongoose.Types.ObjectId;
  employeeName: string;
  companyId: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  date: Date;
  checkIn?: Date;
  checkOut?: Date;
  workHours?: number;
  overtime?: number;
  delay?: number;
  status: 'present' | 'late' | 'absent' | 'leave' | 'official_holiday';
  leaveType?: 'annual' | 'emergency' | 'sick' | 'unpaid';
  lateMinutes: number;
  notes?: string;
  confirmed: boolean;
  isManualEntry: boolean;
  checkInLocation?: {
    latitude: number;
    longitude: number;
    distance: number;
  };
  checkOutLocation?: {
    latitude: number;
    longitude: number;
    distance: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSystemSchema = new Schema({
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  employeeName: { type: String, required: true },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch' },
  date: { type: Date, required: true },
  checkIn: { type: Date },
  checkOut: { type: Date },
  workHours: { type: Number, default: 0 },
  overtime: { type: Number, default: 0 },
  delay: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['present', 'late', 'absent', 'leave', 'official_holiday'],
    required: true 
  },
  leaveType: { 
    type: String, 
    enum: ['annual', 'emergency', 'sick', 'unpaid'] 
  },
  lateMinutes: { type: Number, default: 0 },
  notes: { type: String },
  confirmed: { type: Boolean, default: false },
  isManualEntry: { type: Boolean, default: false },
  checkInLocation: {
    latitude: { type: Number },
    longitude: { type: Number },
    distance: { type: Number }
  },
  checkOutLocation: {
    latitude: { type: Number },
    longitude: { type: Number },
    distance: { type: Number }
  }
}, { timestamps: true });

// Indexes
AttendanceSystemSchema.index({ date: 1, companyId: 1, employeeId: 1 });
AttendanceSystemSchema.index({ companyId: 1, date: -1 });
AttendanceSystemSchema.index({ employeeId: 1, date: -1 });

export default mongoose.model<IAttendanceSystem>('AttendanceSystem', AttendanceSystemSchema);
