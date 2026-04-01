import mongoose, { Schema, Document } from 'mongoose';

export interface IRole extends Document {
  name: string;
  nameEn: string;
  level: number;
  companyId?: mongoose.Types.ObjectId;
}

const RoleSchema = new Schema({
  name: { type: String, required: true },
  nameEn: { type: String, required: true },
  level: { type: Number, required: true },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company' }
}, { timestamps: true });

export default mongoose.model<IRole>('Role', RoleSchema);
