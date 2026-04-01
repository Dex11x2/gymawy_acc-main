import mongoose, { Schema, Document } from 'mongoose';

export interface IBranch extends Document {
  companyId?: mongoose.Types.ObjectId;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  address?: string;
  isActive: boolean;
  // IP-based attendance
  allowedIPs: string[];
  lastIPUpdate?: Date;
}

const BranchSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: false },
  name: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  radius: { type: Number, default: 100 },
  address: { type: String },
  isActive: { type: Boolean, default: true },
  // IP-based attendance
  allowedIPs: { type: [String], default: [] },
  lastIPUpdate: { type: Date }
}, { timestamps: true });

export default mongoose.model<IBranch>('Branch', BranchSchema);
