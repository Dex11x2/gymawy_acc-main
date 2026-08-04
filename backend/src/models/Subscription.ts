import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscription extends Document {
  companyId: mongoose.Types.ObjectId;
  plan: 'basic' | 'professional' | 'enterprise';
  status: 'active' | 'expired' | 'cancelled';
  startDate: Date;
  endDate: Date;
  price: number;
  features: string[];
  maxEmployees: number;
  autoRenew: boolean;
}

const SubscriptionSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, unique: true },
  plan: { type: String, enum: ['basic', 'professional', 'enterprise'], required: true },
  status: { type: String, enum: ['active', 'expired', 'cancelled'], default: 'active' },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  price: { type: Number, required: true },
  features: [{ type: String }],
  maxEmployees: { type: Number, required: true },
  autoRenew: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
