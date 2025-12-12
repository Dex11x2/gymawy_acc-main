import mongoose, { Schema, Document } from 'mongoose';

export interface IOccasion extends Document {
  companyId: mongoose.Types.ObjectId;
  title: string;
  type: 'birthday' | 'holiday' | 'anniversary' | 'other';
  date: Date;
  description?: string;
  isRecurring: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const OccasionSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  title: { type: String, required: true },
  type: { type: String, enum: ['birthday', 'holiday', 'anniversary', 'other'], required: true },
  date: { type: Date, required: true },
  description: { type: String },
  isRecurring: { type: Boolean, default: false },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IOccasion>('Occasion', OccasionSchema);
