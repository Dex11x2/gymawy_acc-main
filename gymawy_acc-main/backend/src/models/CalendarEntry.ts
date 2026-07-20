import mongoose, { Schema, Document } from 'mongoose';

export interface ICalendarComment {
  id: string;
  authorId: mongoose.Types.ObjectId;
  authorName?: string;
  content: string;
  createdAt: Date;
}

export interface ICalendarEntry extends Document {
  monthId: mongoose.Types.ObjectId;
  title: string;                 // اسم الفيديو (Title)
  contentType: string;           // Select key: vlog|podcast|rest|post|ad|reel|long_video
  account: string;               // Select key: gymawya|gymbirch|gymawyz|youssef_ashraf
  publishDate?: Date;            // Publish Date
  videoLink: string;             // Video link (plain text, e.g. Google Drive)
  platforms: string[];           // Multi-select: youtube|tiktok|instagram|facebook
  assigneeId?: mongoose.Types.ObjectId; // Assignee (Person)
  editorId?: mongoose.Types.ObjectId;   // الجامد (second Person, e.g. editor)
  collaboration: string;         // Collaboration (text)
  uploadDeadline: string;        // Upload Deadline (free text, NOT a date)
  filmed: boolean;               // اتصور ؟ (checkbox)
  done: boolean;                 // Done (checkbox)
  scheduled: boolean;            // اتجدول ؟ (checkbox)
  ytSevenDays?: number;          // YT 7days (number)
  instaSevenDays?: number;       // Insta 7days (number)
  tiktokSevenDays?: number;      // TikTok 7days (number)
  script: string;                // free content area (script/caption)
  comments: ICalendarComment[];
  isRest: boolean;               // convenience flag for "راحه" rows
  rowOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const CalendarEntrySchema = new Schema<ICalendarEntry>({
  monthId: { type: Schema.Types.ObjectId, ref: 'CalendarMonth', required: true, index: true },
  title: { type: String, default: '' },
  contentType: { type: String, default: '' },
  account: { type: String, default: '' },
  publishDate: { type: Date },
  videoLink: { type: String, default: '' },
  platforms: { type: [String], default: [] },
  assigneeId: { type: Schema.Types.ObjectId, ref: 'User' },
  editorId: { type: Schema.Types.ObjectId, ref: 'User' },
  collaboration: { type: String, default: '' },
  uploadDeadline: { type: String, default: '' },
  filmed: { type: Boolean, default: false },
  done: { type: Boolean, default: false },
  scheduled: { type: Boolean, default: false },
  ytSevenDays: { type: Number },
  instaSevenDays: { type: Number },
  tiktokSevenDays: { type: Number },
  script: { type: String, default: '' },
  comments: [{
    id: { type: String, required: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  }],
  isRest: { type: Boolean, default: false },
  rowOrder: { type: Number, default: 0 },
}, { timestamps: true });

CalendarEntrySchema.index({ monthId: 1, rowOrder: 1 });

export default mongoose.model<ICalendarEntry>('CalendarEntry', CalendarEntrySchema);
