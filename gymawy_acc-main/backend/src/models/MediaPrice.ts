import mongoose, { Schema, Document } from 'mongoose';

export interface IMediaPrice extends Document {
  type: 'short_video' | 'long_video' | 'vlog' | 'podcast' | 'post_design' | 'thumbnail';
  nameAr: string;
  price: number;
  currency: 'SAR' | 'USD' | 'EGP';
  employeeId: mongoose.Types.ObjectId;
  companyId?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MediaPriceSchema = new Schema({
  type: {
    type: String,
    required: true,
    enum: ['short_video', 'long_video', 'vlog', 'podcast', 'post_design', 'thumbnail']
  },
  nameAr: { type: String, required: true },
  price: { type: Number, required: true, default: 0 },
  currency: {
    type: String,
    enum: ['SAR', 'USD', 'EGP'],
    default: 'SAR'
  },
  // كل موظف له أسعار مستقلة
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Unique constraint per type and employee
MediaPriceSchema.index({ type: 1, employeeId: 1 }, { unique: true });

export default mongoose.model<IMediaPrice>('MediaPrice', MediaPriceSchema);
