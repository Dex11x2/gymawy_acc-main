import mongoose, { Schema, Document } from 'mongoose';

export interface IMediaPrice extends Document {
  type: string; // Dynamic type - validated against ContentType model
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
    required: true
    // No enum - validated dynamically against ContentType
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

// Validation middleware - ensure type exists in ContentType
MediaPriceSchema.pre('save', async function(next) {
  try {
    const ContentType = mongoose.model('ContentType');
    const validType = await ContentType.findOne({ key: this.type, isActive: true });

    if (!validType) {
      throw new Error(`نوع محتوى غير صحيح: ${this.type}`);
    }
    next();
  } catch (error: any) {
    next(error);
  }
});

export default mongoose.model<IMediaPrice>('MediaPrice', MediaPriceSchema);
