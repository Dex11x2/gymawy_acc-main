import mongoose from 'mongoose';
import RolePermission from '../models/RolePermission';

export interface PermissionEntry {
  module: string;
  actions: string[];
}

const ROLE_LEVEL_BY_ENUM: Record<string, number> = {
  super_admin: 4,
  general_manager: 3,
  administrative_manager: 2,
  admin: 2,
  employee: 1,
};

/**
 * Resolve permissions for a user. If `userOverride` is a non-empty array we
 * trust it as the authoritative set for that user (per-employee customisation).
 * Otherwise we fall back to the permissions configured for their role.
 */
export async function computePermissions(
  roleId: mongoose.Types.ObjectId | string | undefined | null,
  userOverride?: PermissionEntry[] | null
): Promise<PermissionEntry[]> {
  if (Array.isArray(userOverride) && userOverride.length > 0) {
    return userOverride.map((p) => ({ module: p.module, actions: [...p.actions] }));
  }
  return computeRolePermissions(roleId);
}

export async function computeRolePermissions(
  roleId: mongoose.Types.ObjectId | string | undefined | null
): Promise<PermissionEntry[]> {
  if (!roleId) return [];

  const rolePerms = await RolePermission.find({ roleId }).populate('pageId').lean();
  const out: PermissionEntry[] = [];

  for (const rp of rolePerms as any[]) {
    if (!rp.pageId) continue;
    const actions: string[] = [];
    if (rp.canView) actions.push('view');
    if (rp.canCreate) actions.push('create');
    if (rp.canEdit) actions.push('edit');
    if (rp.canDelete) actions.push('delete');
    if (rp.canExport) actions.push('export');
    if (actions.length === 0) continue;
    out.push({ module: rp.pageId.module, actions });
  }

  return out;
}

export async function resolveRoleIdFromEnum(
  roleEnum: string | undefined | null
): Promise<mongoose.Types.ObjectId | undefined> {
  if (!roleEnum) return undefined;
  const level = ROLE_LEVEL_BY_ENUM[roleEnum];
  if (!level) return undefined;
  const Role = mongoose.model('Role');
  const role = await Role.findOne({ level });
  return role?._id as mongoose.Types.ObjectId | undefined;
}
