import mongoose, { Schema, Document } from 'mongoose';

export interface IReview extends Document {
  employeeId: mongoose.Types.ObjectId;
  reviewerId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  rating: number;
  comment: string;
  category: 'performance' | 'behavior' | 'skills' | 'general';
  comments: Array<{
    authorId: mongoose.Types.ObjectId;
    authorName: string;
    content: string;
    createdAt: Date;
  }>;
  createdAt: Date;
}

const ReviewSchema = new Schema({
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  reviewerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  category: { type: String, enum: ['performance', 'behavior', 'skills', 'general'], default: 'general' },
  comments: [{
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

export default mongoose.model<IReview>('Review', ReviewSchema);
