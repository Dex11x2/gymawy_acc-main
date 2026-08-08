import mongoose, { Document, Schema } from 'mongoose';

// موظف الشهر — واحد لكل شهر، يظهر لكل الموظفين لحد ما يتغيّر الشهر
export interface IEmployeeOfMonth extends Document {
  month: number;
  year: number;
  employeeId: mongoose.Types.ObjectId;
  employeeName: string;
  reason?: string;
  setById: mongoose.Types.ObjectId;
  setByName: string;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IEmployeeOfMonth>(
  {
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    employeeName: { type: String, required: true },
    reason: { type: String, default: '' },
    setById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    setByName: { type: String, required: true },
  },
  { timestamps: true }
);

schema.index({ year: 1, month: 1 }, { unique: true }); // واحد لكل شهر

export default mongoose.model<IEmployeeOfMonth>('EmployeeOfMonth', schema);
