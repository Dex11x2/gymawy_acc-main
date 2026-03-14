import mongoose, { Schema, Document } from 'mongoose';

export interface IContentItem extends Document {
  accountId: mongoose.Types.ObjectId;
  companyId?: mongoose.Types.ObjectId;
  title: string;
  contentType: string;       // e.g., 'reel', 'post', 'podcast', 'long_video', 'ad', 'rest'
  status: 'open' | 'in_progress' | 'done' | 'published';
  publishDate: Date;
  dueDate?: Date;
  videoLink?: string;
  footageLink?: string;
  script?: string;
  platforms: string[];       // e.g., ['youtube', 'tiktok', 'instagram', 'facebook']
  assignedTo: mongoose.Types.ObjectId[];
  collaborators?: string;
  notes?: string;
  campaignCategory?: string; // Only for ads
  isDone: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ContentItemSchema = new Schema({
  accountId: { type: Schema.Types.ObjectId, ref: 'ContentAccount', required: true },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: false },
  title: { type: String, default: '' },
  contentType: {
    type: String,
    enum: ['reel', 'post', 'podcast', 'long_video', 'ad', 'rest', 'other'],
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'done', 'published'],
    default: 'open'
  },
  publishDate: { type: Date, required: true },
  dueDate: { type: Date },
  videoLink: { type: String },
  footageLink: { type: String },
  script: { type: String },
  platforms: [{ type: String, enum: ['youtube', 'tiktok', 'instagram', 'facebook', 'twitter', 'other'] }],
  assignedTo: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
  collaborators: { type: String },
  notes: { type: String },
  campaignCategory: { type: String },
  isDone: { type: Boolean, default: false },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

ContentItemSchema.index({ accountId: 1, publishDate: 1 });
ContentItemSchema.index({ companyId: 1 });
ContentItemSchema.index({ assignedTo: 1 });
ContentItemSchema.index({ status: 1 });

export default mongoose.model<IContentItem>('ContentItem', ContentItemSchema);
