import mongoose, { Schema, Document } from 'mongoose';

// توكن جهاز لإرسال إشعارات Push (FCM) — لكل مستخدم قد يكون له أكثر من جهاز
export interface IDeviceToken extends Document {
  userId: mongoose.Types.ObjectId;
  token: string;
  platform: string; // android | ios | web
  createdAt: Date;
  updatedAt: Date;
}

const DeviceTokenSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  token: { type: String, required: true, unique: true },
  platform: { type: String, default: 'android' },
}, { timestamps: true });

export default mongoose.model<IDeviceToken>('DeviceToken', DeviceTokenSchema);
