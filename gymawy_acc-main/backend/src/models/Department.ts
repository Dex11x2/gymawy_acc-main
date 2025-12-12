import mongoose, { Schema, Document } from 'mongoose';

export interface IDepartment extends Document {
  companyId?: mongoose.Types.ObjectId;
  name: string;
  description: string;
  managerId?: mongoose.Types.ObjectId;
  budget: number;
  isActive: boolean;
}

const DepartmentSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
  name: { type: String, required: true },
  description: { type: String },
  managerId: { type: Schema.Types.ObjectId, ref: 'Employee' },
  budget: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model<IDepartment>('Department', DepartmentSchema);
