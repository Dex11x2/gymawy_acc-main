import mongoose, { Schema, Document } from 'mongoose';

export interface ICommunication extends Document {
  companyId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  recipientIds: mongoose.Types.ObjectId[];
  subject: string;
  content: string;
  type: 'announcement' | 'memo' | 'notification';
  priority: 'low' | 'medium' | 'high';
  isRead: boolean[];
}

const CommunicationSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  recipientIds: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
  subject: { type: String, required: true },
  content: { type: String, required: true },
  type: { type: String, enum: ['announcement', 'memo', 'notification'], default: 'notification' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  isRead: [{ type: Boolean, default: false }]
}, { timestamps: true });

export default mongoose.model<ICommunication>('Communication', CommunicationSchema);
