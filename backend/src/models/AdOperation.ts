import mongoose, { Schema, Document } from 'mongoose';

export interface IAdOperation extends Document {
  companyId?: mongoose.Types.ObjectId;
  platform: 'tiktok' | 'instagram';
  date: Date;
  action: string;
  cost: number;
  clientsCount: number;
  revenue: number;
  currency: 'SAR' | 'USD' | 'KWD' | 'EGP';
  createdBy: mongoose.Types.ObjectId;
}

const AdOperationSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: false },
  platform: { type: String, enum: ['tiktok', 'instagram'], required: true },
  date: { type: Date, required: true },
  action: { type: String, required: true },
  cost: { type: Number, required: true, default: 0 },
  clientsCount: { type: Number, required: true, default: 0 },
  revenue: { type: Number, required: true, default: 0 },
  currency: { type: String, enum: ['SAR', 'USD', 'KWD', 'EGP'], default: 'SAR' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: false }
}, { timestamps: true });

export default mongoose.model<IAdOperation>('AdOperation', AdOperationSchema);
