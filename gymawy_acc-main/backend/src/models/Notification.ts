import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  companyId?: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  readAt?: Date;
  senderId?: mongoose.Types.ObjectId;
  senderName?: string;
  link?: string;
}

const NotificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: false },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date },
  senderId: { type: Schema.Types.ObjectId, ref: 'User' },
  senderName: { type: String },
  link: { type: String }
}, { timestamps: true });

export default mongoose.model<INotification>('Notification', NotificationSchema);
