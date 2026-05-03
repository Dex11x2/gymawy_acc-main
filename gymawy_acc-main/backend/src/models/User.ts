import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  email: string;
  password: string;
  phone?: string;
  name: string;
  role: "super_admin" | "general_manager" | "administrative_manager" | "employee";
  roleId?: mongoose.Types.ObjectId;
  companyId?: mongoose.Types.ObjectId;
  departmentId?: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  birthDate?: Date;
  isActive: boolean;
  comparePassword(password: string): Promise<boolean>;
}

const ROLE_LEVEL_BY_ENUM: Record<string, number> = {
  super_admin: 4,
  general_manager: 3,
  administrative_manager: 2,
  employee: 1,
};

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
  },
  { timestamps: true }
);

UserSchema.index({ phone: 1 });
UserSchema.index({ companyId: 1, role: 1 });
UserSchema.index({ departmentId: 1 });
UserSchema.index({ branchId: 1 });
UserSchema.index({ isActive: 1 });

UserSchema.pre("save", async function (next) {
  if (this.isModified("password") && !this.password.startsWith("$2")) {
    this.password = await bcrypt.hash(this.password, 10);
  }

  if (!this.roleId && this.role) {
    const Role = mongoose.model("Role");
    const level = ROLE_LEVEL_BY_ENUM[this.role];
    if (level) {
      const role = await Role.findOne({ level });
      if (role) this.roleId = role._id as mongoose.Types.ObjectId;
    }
  }

  next();
});

UserSchema.methods.comparePassword = async function (
  password: string
): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

export default mongoose.model<IUser>("User", UserSchema);
