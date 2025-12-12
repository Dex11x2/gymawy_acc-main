import mongoose, { Schema, Document } from 'mongoose';

export interface ICompany extends Document {
  name: string;
  industry: string;
  address: string;
  phone: string;
  email: string;
  subscriptionPlan: string;
  subscriptionExpiry: Date;
  isActive: boolean;
  generalManagerId?: mongoose.Types.ObjectId;
  administrativeManagerId?: mongoose.Types.ObjectId;
  location?: {
    latitude: number;
    longitude: number;
    radius: number;
  };
}

const CompanySchema = new Schema({
  name: { type: String, required: true },
  industry: { type: String, required: true },
  address: { type: String },
  phone: { type: String },
  email: { type: String },
  subscriptionPlan: { type: String, default: 'basic' },
  subscriptionExpiry: { type: Date },
  isActive: { type: Boolean, default: true },
  generalManagerId: { type: Schema.Types.ObjectId, ref: 'Employee' },
  administrativeManagerId: { type: Schema.Types.ObjectId, ref: 'Employee' },
  location: {
    latitude: { type: Number },
    longitude: { type: Number },
    radius: { type: Number, default: 100 }
  }
}, { timestamps: true });

export default mongoose.model<ICompany>('Company', CompanySchema);
