import mongoose, { Schema, Document } from 'mongoose';

export type ReviewStepKind = 'upload' | 'revision' | 'edit_request' | 'approve';

export interface IReviewStep {
  id: string;
  byId: mongoose.Types.ObjectId;
  byName?: string;
  kind: ReviewStepKind;
  link?: string;          // Google Drive (or any) link for upload/revision steps
  note?: string;          // what was done / what edit is requested
  mentionId?: mongoose.Types.ObjectId; // who is asked to act next
  mentionName?: string;
  seenAt?: Date;          // when the mentioned person opened this step
  createdAt: Date;
}

export interface IVideoReview extends Document {
  companyId?: mongoose.Types.ObjectId;
  title: string;
  account?: string;       // optional CalendarAccount key
  createdById: mongoose.Types.ObjectId;
  createdByName?: string;
  status: 'in_review' | 'changes_requested' | 'approved';
  currentMentionId?: mongoose.Types.ObjectId; // person currently asked to act
  steps: IReviewStep[];
  linkedEntryId?: mongoose.Types.ObjectId;    // set on approve
  finalLink?: string;
  approvedById?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewStepSchema = new Schema({
  id: { type: String, required: true },
  byId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  byName: { type: String },
  kind: { type: String, enum: ['upload', 'revision', 'edit_request', 'approve'], required: true },
  link: { type: String },
  note: { type: String },
  mentionId: { type: Schema.Types.ObjectId, ref: 'User' },
  mentionName: { type: String },
  seenAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const VideoReviewSchema = new Schema<IVideoReview>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
  title: { type: String, required: true, trim: true },
  account: { type: String, default: '' },
  createdById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdByName: { type: String },
  status: { type: String, enum: ['in_review', 'changes_requested', 'approved'], default: 'in_review' },
  currentMentionId: { type: Schema.Types.ObjectId, ref: 'User' },
  steps: [ReviewStepSchema],
  linkedEntryId: { type: Schema.Types.ObjectId, ref: 'CalendarEntry' },
  finalLink: { type: String },
  approvedById: { type: Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
}, { timestamps: true });

VideoReviewSchema.index({ status: 1, updatedAt: -1 });

export default mongoose.model<IVideoReview>('VideoReview', VideoReviewSchema);
