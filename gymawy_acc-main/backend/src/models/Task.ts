import mongoose, { Schema, Document } from 'mongoose';

export interface ITaskComment {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: Date;
}

export interface ITask extends Document {
  companyId?: mongoose.Types.ObjectId;
  title: string;
  description: string;
  assignedTo: mongoose.Types.ObjectId;
  assignedBy: mongoose.Types.ObjectId;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  dueDate: Date;
  comments: ITaskComment[];
  createdAt: Date;
  updatedAt: Date;
}

const TaskCommentSchema = new Schema({
  authorId: { type: String, required: true },
  authorName: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const TaskSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: false },
  title: { type: String, required: true },
  description: { type: String },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  assignedBy: { type: Schema.Types.ObjectId, ref: 'Employee', required: false },
  status: { type: String, enum: ['pending', 'in_progress', 'completed', 'cancelled'], default: 'pending' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  dueDate: { type: Date },
  comments: [TaskCommentSchema]
}, { timestamps: true });

export default mongoose.model<ITask>('Task', TaskSchema);
