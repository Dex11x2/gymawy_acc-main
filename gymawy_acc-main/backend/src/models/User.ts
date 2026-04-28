import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  email: string;
  password: string;
  plainPassword?: string;
  phone?: string;
  name: string;
  role: "super_admin" | "general_manager" | "administrative_manager" | "employee";
  roleId?: mongoose.Types.ObjectId;
  companyId?: mongoose.Types.ObjectId;
  departmentId?: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  birthDate?: Date;
  isActive: boolean;
  permissions?: any[];
  comparePassword(password: string): Promise<boolean>;
}

const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String },
    password: { type: String, required: true, minlength: 6 },
    plainPassword: { type: String },
    name: { type: String, required: true },
    role: {
      type: String,
      enum: ["super_admin", "general_manager", "administrative_manager", "employee"],
      default: "employee",
    },
    roleId: { type: Schema.Types.ObjectId, ref: "Role" },
    companyId: { type: Schema.Types.ObjectId, ref: "Company" },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department" },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch" },
    birthDate: { type: Date },
    isActive: { type: Boolean, default: true },
    permissions: [{ module: String, actions: [String] }],
  },
  { timestamps: true }
);

UserSchema.index({ phone: 1 });
UserSchema.index({ companyId: 1, role: 1 });
UserSchema.index({ departmentId: 1 });
UserSchema.index({ branchId: 1 });
UserSchema.index({ isActive: 1 });

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  if (this.password.startsWith("$2")) {
    return next();
  }

  this.plainPassword = this.password;
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

UserSchema.methods.comparePassword = async function (
  password: string
): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

export default mongoose.model<IUser>("User", UserSchema);
