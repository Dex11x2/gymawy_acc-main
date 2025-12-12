import mongoose, { Schema, Document } from 'mongoose';

export interface IRolePermission extends Document {
  roleId: mongoose.Types.ObjectId;
  pageId: mongoose.Types.ObjectId;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canCreate: boolean;
  canExport: boolean;
}

const RolePermissionSchema = new Schema({
  roleId: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
  pageId: { type: Schema.Types.ObjectId, ref: 'Page', required: true },
  canView: { type: Boolean, default: false },
  canEdit: { type: Boolean, default: false },
  canDelete: { type: Boolean, default: false },
  canCreate: { type: Boolean, default: false },
  canExport: { type: Boolean, default: false }
}, { timestamps: true });

RolePermissionSchema.index({ roleId: 1, pageId: 1 }, { unique: true });

export default mongoose.model<IRolePermission>('RolePermission', RolePermissionSchema);
