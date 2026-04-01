import mongoose, { Schema, Document } from 'mongoose';

export interface IPage extends Document {
  name: string;
  nameEn: string;
  path: string;
  icon: string;
  module: string;
}

const PageSchema = new Schema({
  name: { type: String, required: true },
  nameEn: { type: String, required: true },
  path: { type: String, required: true },
  icon: { type: String },
  module: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model<IPage>('Page', PageSchema);
