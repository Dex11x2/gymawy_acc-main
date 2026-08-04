import mongoose, { Schema, Document } from 'mongoose';

export interface IMediaAchievementItem {
  contentType: string; // Dynamic type - validated against ContentType model
  quantity: number;
  price: number;
  total: number;
}

export interface IMediaAchievement extends Document {
  employeeId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  month: number;
  year: number;
  items: IMediaAchievementItem[];
  totalAmount: number;
  syncedToPayroll: boolean;
  syncedAt?: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MediaAchievementItemSchema = new Schema({
  contentType: {
    type: String,
    required: true
    // No enum - validated dynamically against ContentType
  },
  quantity: { type: Number, required: true, default: 0 },
  price: { type: Number, required: true, default: 0 },
  total: { type: Number, required: true, default: 0 }
}, { _id: false });

const MediaAchievementSchema = new Schema({
  employeeId: {
    type: Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true
  },
  items: [MediaAchievementItemSchema],
  totalAmount: {
    type: Number,
    required: true,
    default: 0
  },
  syncedToPayroll: {
    type: Boolean,
    default: false
  },
  syncedAt: {
    type: Date
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

// Unique constraint - موظف واحد لكل شهر/سنة
MediaAchievementSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });

// Index for faster queries
MediaAchievementSchema.index({ companyId: 1, month: 1, year: 1 });

// Validation middleware - ensure all contentTypes exist in ContentType
MediaAchievementSchema.pre('save', async function(next) {
  try {
    const ContentType = mongoose.model('ContentType');

    // Check each item's contentType
    for (const item of this.items) {
      const validType = await ContentType.findOne({ key: item.contentType, isActive: true });

      if (!validType) {
        throw new Error(`نوع محتوى غير صحيح: ${item.contentType}`);
      }
    }

    next();
  } catch (error: any) {
    next(error);
  }
});

export default mongoose.model<IMediaAchievement>('MediaAchievement', MediaAchievementSchema);
