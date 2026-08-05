import mongoose, { Schema, Document } from 'mongoose';

export interface ILeaveRequest extends Document {
  employeeId: mongoose.Types.ObjectId;
  employeeName: string;
  leaveType: 'annual' | 'sick' | 'emergency' | 'unpaid' | 'permission';
  startDate: Date;
  endDate: Date;
  days: number;
  hours?: number;          // للإذونات (ساعات)
  startTime?: string;      // وقت الإذن (اختياري، نص مثل 14:00)
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  warnings?: string[];     // مخالفات القواعد (تنبيه للمدير — قواعد ناعمة)
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedByName?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  companyId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LeaveRequestSchema = new Schema<ILeaveRequest>({
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  employeeName: { type: String, required: true },
  leaveType: {
    type: String,
    enum: ['annual', 'sick', 'emergency', 'unpaid', 'permission'],
    required: true
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  days: { type: Number, default: 0 },
  hours: { type: Number },
  startTime: { type: String },
  reason: { type: String, default: '' },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  warnings: { type: [String], default: [] },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedByName: { type: String },
  reviewedAt: { type: Date },
  reviewNotes: { type: String },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: false }
}, {
  timestamps: true
});

export default mongoose.model<ILeaveRequest>('LeaveRequest', LeaveRequestSchema);
