import mongoose, { Schema, Document } from 'mongoose';

export interface IComplaint extends Document {
  userId: mongoose.Types.ObjectId;
  userName: string;
  companyId?: mongoose.Types.ObjectId;
  type: 'complaint' | 'suggestion' | 'technical_issue';
  title: string;
  description: string;
  recipientType: 'general_manager' | 'administrative_manager' | 'technical_support';
  recipientId: string;
  status: 'pending' | 'in-progress' | 'resolved' | 'rejected';
  response?: string;
  respondedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ComplaintSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: false },
  type: { 
    type: String, 
    enum: ['complaint', 'suggestion', 'technical_issue'], 
    required: true 
  },
  title: { type: String, required: true },
  description: { type: String, required: true },
  recipientType: { 
    type: String, 
    enum: ['general_manager', 'administrative_manager', 'technical_support'], 
    required: true 
  },
  recipientId: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'in-progress', 'resolved', 'rejected'], 
    default: 'pending' 
  },
  response: { type: String },
  respondedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model<IComplaint>('Complaint', ComplaintSchema);
