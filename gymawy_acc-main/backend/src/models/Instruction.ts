import mongoose, { Schema, Document } from 'mongoose';

export interface IInstruction extends Document {
  title: string;
  content: string;
  category: 'work-rules' | 'rights' | 'duties' | 'procedures' | 'other';
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const InstructionSchema = new Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['work-rules', 'rights', 'duties', 'procedures', 'other'],
    default: 'other'
  },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

export default mongoose.model<IInstruction>('Instruction', InstructionSchema);
