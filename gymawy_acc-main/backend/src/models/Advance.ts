import mongoose, { Schema, Document } from 'mongoose';

export interface IAdvance extends Document {
  companyId?: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  amount: number;
  currency: 'EGP' | 'SAR' | 'USD';
  reason: string;
  requestDate: Date;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  approvedBy?: mongoose.Types.ObjectId;
  paidDate?: Date;
  deductionStartMonth?: string;
  monthlyDeduction?: number;
  remainingAmount?: number;
  notes?: string;
}

const AdvanceSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: false },
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, enum: ['EGP', 'SAR', 'USD'], default: 'EGP' },
  reason: { type: String, required: true },
  requestDate: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'paid'], default: 'pending' },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  paidDate: { type: Date },
  deductionStartMonth: { type: String },
  monthlyDeduction: { type: Number },
  remainingAmount: { type: Number },
  notes: { type: String }
}, { timestamps: true });

export default mongoose.model<IAdvance>('Advance', AdvanceSchema);
