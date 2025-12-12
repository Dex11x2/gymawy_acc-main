import mongoose, { Schema, Document } from 'mongoose';

export interface ISalary extends Document {
  employeeId: mongoose.Types.ObjectId;
  companyId?: mongoose.Types.ObjectId;
  month: number; // 1-12
  year: number;
  baseSalary: number;
  currency: 'EGP' | 'SAR' | 'USD' | 'AED';

  // Additions
  bonuses: {
    description: string;
    amount: number;
  }[];
  allowances: {
    description: string;
    amount: number;
  }[];

  // Deductions
  deductions: {
    description: string;
    amount: number;
  }[];
  lateDeductions: {
    date: Date;
    minutes: number;
    amount: number;
  }[];
  absenceDeductions: {
    date: Date;
    amount: number;
  }[];

  // Calculated fields
  totalBonuses: number;
  totalAllowances: number;
  totalDeductions: number;
  totalLateDeductions: number;
  totalAbsenceDeductions: number;
  netSalary: number;

  // Payment status
  isPaid: boolean;
  paidAt?: Date;
  paidBy?: mongoose.Types.ObjectId;
  paymentMethod?: 'cash' | 'bank_transfer' | 'check';
  paymentReference?: string;

  notes?: string;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
}

const SalarySchema = new Schema({
  employeeId: {
    type: Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company'
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
  baseSalary: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    enum: ['EGP', 'SAR', 'USD', 'AED'],
    default: 'EGP'
  },

  // Additions
  bonuses: [{
    description: { type: String, required: true },
    amount: { type: Number, required: true }
  }],
  allowances: [{
    description: { type: String, required: true },
    amount: { type: Number, required: true }
  }],

  // Deductions
  deductions: [{
    description: { type: String, required: true },
    amount: { type: Number, required: true }
  }],
  lateDeductions: [{
    date: { type: Date, required: true },
    minutes: { type: Number, required: true },
    amount: { type: Number, required: true }
  }],
  absenceDeductions: [{
    date: { type: Date, required: true },
    amount: { type: Number, required: true }
  }],

  // Calculated fields
  totalBonuses: {
    type: Number,
    default: 0
  },
  totalAllowances: {
    type: Number,
    default: 0
  },
  totalDeductions: {
    type: Number,
    default: 0
  },
  totalLateDeductions: {
    type: Number,
    default: 0
  },
  totalAbsenceDeductions: {
    type: Number,
    default: 0
  },
  netSalary: {
    type: Number,
    default: 0
  },

  // Payment status
  isPaid: {
    type: Boolean,
    default: false
  },
  paidAt: {
    type: Date
  },
  paidBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'check']
  },
  paymentReference: {
    type: String
  },

  notes: {
    type: String
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for faster queries
SalarySchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });
SalarySchema.index({ companyId: 1, month: 1, year: 1 });
SalarySchema.index({ isPaid: 1 });

// Pre-save hook to calculate totals
SalarySchema.pre('save', function(next) {
  // Calculate totals
  this.totalBonuses = this.bonuses.reduce((sum, b) => sum + b.amount, 0);
  this.totalAllowances = this.allowances.reduce((sum, a) => sum + a.amount, 0);
  this.totalDeductions = this.deductions.reduce((sum, d) => sum + d.amount, 0);
  this.totalLateDeductions = this.lateDeductions.reduce((sum, l) => sum + l.amount, 0);
  this.totalAbsenceDeductions = this.absenceDeductions.reduce((sum, a) => sum + a.amount, 0);

  // Calculate net salary
  const additions = this.totalBonuses + this.totalAllowances;
  const deductions = this.totalDeductions + this.totalLateDeductions + this.totalAbsenceDeductions;
  this.netSalary = this.baseSalary + additions - deductions;

  next();
});

export default mongoose.model<ISalary>('Salary', SalarySchema);
