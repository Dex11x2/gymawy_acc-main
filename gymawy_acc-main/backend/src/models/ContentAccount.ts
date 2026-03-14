import mongoose, { Schema, Document } from 'mongoose';

export interface IContentAccount extends Document {
  name: string;
  companyId: mongoose.Types.ObjectId;
  description?: string;
  isActive: boolean;
  displayOrder: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ContentAccountSchema = new Schema({
  name: { type: String, required: true },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: false },
  description: { type: String },
  isActive: { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0 },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

ContentAccountSchema.index({ companyId: 1, isActive: 1 });

export default mongoose.model<IContentAccount>('ContentAccount', ContentAccountSchema);
