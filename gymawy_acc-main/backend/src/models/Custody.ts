import mongoose, { Schema, Document } from 'mongoose';

export interface ICustody extends Document {
  companyId?: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  type: 'material' | 'financial';
  itemName: string;
  amount?: number;
  currency?: 'EGP' | 'SAR' | 'USD';
  status: 'active' | 'returned';
  issueDate: Date;
  returnDate?: Date;
  notes: string;
}

const CustodySchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: false },
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  type: { type: String, enum: ['material', 'financial'], required: true },
  itemName: { type: String, required: true },
  amount: { type: Number },
  currency: { type: String, enum: ['EGP', 'SAR', 'USD'] },
  status: { type: String, enum: ['active', 'returned'], default: 'active' },
  issueDate: { type: Date, default: Date.now },
  returnDate: { type: Date },
  notes: { type: String }
}, { timestamps: true });

export default mongoose.model<ICustody>('Custody', CustodySchema);
