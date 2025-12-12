import mongoose, { Schema, Document } from 'mongoose';

export interface IEmployee extends Document {
  userId: mongoose.Types.ObjectId;
  companyId?: mongoose.Types.ObjectId;
  departmentId?: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  position: string;
  salary: number;
  salaryCurrency: 'EGP' | 'SAR' | 'USD' | 'AED';
  hireDate: Date;
  isGeneralManager: boolean;
  isAdministrativeManager: boolean;
  isActive: boolean;
  permissions?: any[];
  leaveBalance: {
    annual: number;
    emergency: number;
  };
  workLocation?: {
    latitude: number;
    longitude: number;
    radius: number;
    address?: string;
  };
}

const EmployeeSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
  departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  position: { type: String, required: true },
  salary: { type: Number, required: true },
  salaryCurrency: { type: String, enum: ['EGP', 'SAR', 'USD', 'AED'], default: 'EGP' },
  hireDate: { type: Date, default: Date.now },
  isGeneralManager: { type: Boolean, default: false },
  isAdministrativeManager: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  leaveBalance: {
    annual: { type: Number, default: 21 },
    emergency: { type: Number, default: 7 }
  },
  workLocation: {
    latitude: { type: Number },
    longitude: { type: Number },
    radius: { type: Number, default: 100 },
    address: { type: String }
  }
}, { timestamps: true });

export default mongoose.model<IEmployee>('Employee', EmployeeSchema);
