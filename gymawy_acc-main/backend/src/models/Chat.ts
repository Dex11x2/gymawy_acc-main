import mongoose, { Schema, Document } from 'mongoose';

export interface IChat extends Document {
  companyId: mongoose.Types.ObjectId;
  participants: mongoose.Types.ObjectId[];
  lastMessage?: string;
  lastMessageAt?: Date;
  isGroup: boolean;
  groupName?: string;
}

const ChatSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
  lastMessage: { type: String },
  lastMessageAt: { type: Date },
  isGroup: { type: Boolean, default: false },
  groupName: { type: String }
}, { timestamps: true });

export default mongoose.model<IChat>('Chat', ChatSchema);
