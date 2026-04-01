import mongoose, { Schema, Document } from 'mongoose';

export interface IPayroll extends Document {
  companyId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  month: string;
  year: number;
  baseSalary: number;
  bonuses: number;
  deductions: number;
  netSalary: number;
  currency: 'EGP' | 'SAR' | 'USD' | 'AED';
  status: 'pending' | 'paid';
  paidDate?: Date;
  notes: string;
}

const PayrollSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  month: { type: String, required: true },
  year: { type: Number, required: true },
  baseSalary: { type: Number, required: true },
  bonuses: { type: Number, default: 0 },
  deductions: { type: Number, default: 0 },
  netSalary: { type: Number, required: true },
  currency: { type: String, enum: ['EGP', 'SAR', 'USD', 'AED'], default: 'EGP' },
  status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  paidDate: { type: Date },
  notes: { type: String }
}, { timestamps: true });

export default mongoose.model<IPayroll>('Payroll', PayrollSchema);
