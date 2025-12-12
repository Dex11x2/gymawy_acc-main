import mongoose, { Schema, Document } from 'mongoose';

export interface IAttendance extends Document {
  companyId?: mongoose.Types.ObjectId;
  date: Date;
  month: number;
  year: number;
  day: number;
  attendance: Array<{
    employeeId: string;
    employeeName: string;
    status: 'present' | 'absent' | 'late' | 'leave';
    checkIn?: string;
    checkOut?: string;
    lateHours: number;
    overtimeHours: number;
    leaveType?: 'official' | 'annual' | 'sick' | 'unpaid';
    notes: string;
  }>;
}

const AttendanceSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: false },
  date: { type: Date, required: true },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  day: { type: Number, required: true },
  attendance: [{
    employeeId: { type: String, required: true },
    employeeName: { type: String, required: true },
    status: { type: String, enum: ['present', 'absent', 'late', 'leave'], default: 'present' },
    checkIn: { type: String },
    checkOut: { type: String },
    lateHours: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },
    leaveType: { type: String, enum: ['official', 'annual', 'sick', 'unpaid'] },
    notes: { type: String }
  }]
}, { timestamps: true });

export default mongoose.model<IAttendance>('Attendance', AttendanceSchema);
