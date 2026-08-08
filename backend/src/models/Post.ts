import mongoose, { Schema, Document } from 'mongoose';

export interface IPost extends Document {
  companyId?: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  content: string;
  likes: mongoose.Types.ObjectId[];
  targetDepartment?: string;
  comments: Array<{
    id: string;
    authorId: mongoose.Types.ObjectId;
    content: string;
    image?: string;
    createdAt: Date;
  }>;
  images?: string[];
  attachments?: Array<{
    id: string;
    type: 'pdf' | 'excel' | 'word' | 'image' | 'other';
    name: string;
    url: string;
    size: number;
  }>;
  reactions?: Array<{ userId: mongoose.Types.ObjectId; emoji: string }>;
  pinned?: boolean;
  poll?: {
    question: string;
    options: Array<{ id: string; text: string; votes: mongoose.Types.ObjectId[] }>;
  } | null;
}

const PostSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: false },
  authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  targetDepartment: { type: String },
  likes: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
  comments: [{
    id: { type: String, required: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String },
    content: { type: String, required: true },
    image: { type: String },
    createdAt: { type: Date, default: Date.now }
  }],
  images: [{ type: String }],
  attachments: [{
    id: { type: String, required: true },
    type: { type: String, enum: ['pdf', 'excel', 'word', 'image', 'other'] },
    name: { type: String, required: true },
    url: { type: String, required: true },
    size: { type: Number, required: true }
  }],
  reactions: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    emoji: { type: String, required: true }
  }],
  pinned: { type: Boolean, default: false },
  poll: {
    type: {
      question: { type: String },
      options: [{
        id: { type: String, required: true },
        text: { type: String, required: true },
        votes: [{ type: Schema.Types.ObjectId, ref: 'User' }]
      }]
    },
    default: null
  }
}, { timestamps: true });

export default mongoose.model<IPost>('Post', PostSchema);
