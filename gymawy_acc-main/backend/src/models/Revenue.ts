import mongoose, { Schema, Document } from 'mongoose';

export interface IRevenue extends Document {
  companyId?: mongoose.Types.ObjectId;
  departmentId?: mongoose.Types.ObjectId;
  title: string;
  amount: number;
  currency: 'EGP' | 'SAR' | 'USD' | 'AED';
  category: string;
  date: Date;
  description: string;
  notes?: string;
  source?: string;
  createdBy: mongoose.Types.ObjectId;
}

const RevenueSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: false },
  departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
  title: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, enum: ['EGP', 'SAR', 'USD', 'AED'], default: 'EGP' },
  category: { type: String, required: true },
  date: { type: Date, default: Date.now },
  description: { type: String },
  notes: { type: String },
  source: { type: String },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: false }
}, { timestamps: true });

export default mongoose.model<IRevenue>('Revenue', RevenueSchema);
