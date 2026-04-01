import mongoose, { Schema, Document } from 'mongoose';

export interface IContentType extends Document {
  key: string;           // e.g., 'short_video' (unique)
  nameAr: string;        // e.g., 'فيديو قصير'
  nameEn: string;        // e.g., 'Short Video'
  defaultPrice: number;  // السعر الافتراضي
  currency: 'SAR' | 'USD' | 'EGP';
  isActive: boolean;     // للحذف الناعم
  displayOrder: number;  // ترتيب العرض
  companyId?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ContentTypeSchema = new Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^[a-z_]+$/  // أحرف إنجليزية صغيرة وشرطة سفلية فقط
  },
  nameAr: { type: String, required: true },
  nameEn: { type: String, required: true },
  defaultPrice: { type: Number, required: true, default: 0, min: 0 },
  currency: {
    type: String,
    enum: ['SAR', 'USD', 'EGP'],
    default: 'SAR'
  },
  isActive: { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0 },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// Indexes
ContentTypeSchema.index({ key: 1 }, { unique: true });
ContentTypeSchema.index({ companyId: 1, isActive: 1 });
ContentTypeSchema.index({ displayOrder: 1 });

export default mongoose.model<IContentType>('ContentType', ContentTypeSchema);
