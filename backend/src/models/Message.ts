import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  companyId?: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  content: string;
  isRead: boolean;
  readAt?: Date;
}

const MessageSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: false },
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date }
}, { timestamps: true });

export default mongoose.model<IMessage>('Message', MessageSchema);
