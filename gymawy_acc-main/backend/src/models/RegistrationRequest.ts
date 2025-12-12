import mongoose, { Schema, Document } from 'mongoose';

export interface IRegistrationRequest extends Document {
  companyName: string;
  industry: string;
  email: string;
  phone: string;
  adminName: string;
  password: string;
  subscriptionPlan: string;
  subscriptionDuration: number;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
}

const RegistrationRequestSchema = new Schema({
  companyName: { type: String, required: true },
  industry: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  adminName: { type: String, required: true },
  password: { type: String, required: true },
  subscriptionPlan: { type: String, required: true },
  subscriptionDuration: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  rejectionReason: { type: String }
}, { timestamps: true });

export default mongoose.model<IRegistrationRequest>('RegistrationRequest', RegistrationRequestSchema);
