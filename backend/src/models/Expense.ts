import mongoose, { Schema, Document } from 'mongoose';
import { softDeletePlugin } from '../utils/softDelete';

export interface IExpense extends Document {
  companyId?: mongoose.Types.ObjectId;
  departmentId?: mongoose.Types.ObjectId;
  title: string;
  amount: number;
  currency: 'EGP' | 'SAR' | 'USD' | 'AED';
  category: string;
  date: Date;
  description: string;
  notes?: string;
  type: 'operational' | 'capital' | 'refund';
  // حقول المرتجعات (عملاء ألغوا اشتراكهم)
  customerName?: string;
  customerPhone?: string;
  customerType?: 'egyptian' | 'saudi' | 'other';
  refundReason?: string;
  createdBy: mongoose.Types.ObjectId;
}

const ExpenseSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: false },
  departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
  title: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, enum: ['EGP', 'SAR', 'USD', 'AED'], default: 'EGP' },
  category: { type: String, required: true },
  date: { type: Date, default: Date.now },
  description: { type: String },
  notes: { type: String },
  type: { type: String, enum: ['operational', 'capital', 'refund'], default: 'operational' },
  customerName: { type: String },
  customerPhone: { type: String },
  customerType: { type: String, enum: ['egyptian', 'saudi', 'other'] },
  refundReason: { type: String },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: false }
}, { timestamps: true });

ExpenseSchema.index({ companyId: 1, date: -1 });
ExpenseSchema.index({ departmentId: 1, date: -1 });
ExpenseSchema.index({ category: 1 });
ExpenseSchema.index({ createdBy: 1 });

ExpenseSchema.plugin(softDeletePlugin);

export default mongoose.model<IExpense>('Expense', ExpenseSchema);
