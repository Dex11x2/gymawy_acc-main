import mongoose, { Schema, Document } from 'mongoose';

export interface IDevTask extends Document {
  title: string;
  description: string;
  priority: number;
  status: 'pending' | 'in_progress' | 'testing' | 'completed' | 'blocked';
  assignedTo: string;
  assignedBy: string;
  startDate?: Date;
  dueDate: Date;
  testingStatus: 'not_tested' | 'testing' | 'passed' | 'failed';
  testingNotes?: string;
  deploymentReady: boolean;
  tags?: string[];
  attachments?: Array<{
    name: string;
    url: string;
    uploadedAt: Date;
  }>;
  comments?: Array<{
    userId: string;
    userName: string;
    content: string;
    createdAt: Date;
  }>;
  modifications?: Array<{
    id: string;
    userId: string;
    userName: string;
    action: 'created' | 'updated_status' | 'updated_testing' | 'edited' | 'commented' | 'assigned';
    field?: string;
    oldValue?: string;
    newValue?: string;
    description: string;
    timestamp: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const DevTaskSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    priority: {
      type: Number,
      min: 1,
      max: 10,
      default: 5,
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'testing', 'completed', 'blocked'],
      default: 'pending',
    },
    assignedTo: {
      type: String,
      required: true,
    },
    assignedBy: {
      type: String,
      required: true,
    },
    startDate: {
      type: Date,
      required: false,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    completedDate: {
      type: Date,
      required: false,
    },
    testingStatus: {
      type: String,
      enum: ['not_tested', 'testing', 'passed', 'failed'],
      default: 'not_tested',
    },
    testingNotes: {
      type: String,
    },
    deploymentReady: {
      type: Boolean,
      default: false,
    },
    tags: [{
      type: String,
    }],
    attachments: [{
      name: String,
      url: String,
      uploadedAt: Date,
    }],
    comments: [{
      userId: String,
      userName: String,
      content: String,
      createdAt: Date,
    }],
    modifications: [{
      id: String,
      userId: String,
      userName: String,
      action: {
        type: String,
        enum: ['created', 'updated_status', 'updated_testing', 'edited', 'commented', 'assigned'],
      },
      field: String,
      oldValue: String,
      newValue: String,
      description: String,
      timestamp: Date,
    }],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IDevTask>('DevTask', DevTaskSchema);
