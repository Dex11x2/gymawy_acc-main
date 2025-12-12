import { Response } from 'express';
import RolePermission from '../models/RolePermission';
import Role from '../models/Role';
import Page from '../models/Page';
import { ensureId } from '../utils/mongooseHelper';

export const getRolePermissions = async (req: any, res: Response) => {
  try {
    const { roleId } = req.params;

    const permissions = await RolePermission.find({ roleId })
      .populate('pageId', 'name nameEn path icon module');

    // Convert to JSON and ensure _id is present
    const permissionsJSON = ensureId(permissions);

    res.json({ success: true, data: permissionsJSON });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllRoles = async (_req: any, res: Response) => {
  try {
    const roles = await Role.find().sort({ level: 1 });

    // Convert to JSON and ensure _id is present
    const rolesJSON = ensureId(roles);

    res.json({ success: true, data: rolesJSON });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllPages = async (_req: any, res: Response) => {
  try {
    const pages = await Page.find().sort({ name: 1 });

    // Convert to JSON and ensure _id is present
    const pagesJSON = ensureId(pages);

    res.json({ success: true, data: pagesJSON });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateRolePermissions = async (req: any, res: Response) => {
  try {
    const { roleId, pageId, canView, canCreate, canEdit, canDelete, canExport } = req.body;
    
    const permission = await RolePermission.findOneAndUpdate(
      { roleId, pageId },
      { canView, canCreate, canEdit, canDelete, canExport },
      { upsert: true, new: true }
    );
    
    res.json({ success: true, data: permission });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getUserPermissions = async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    const User = (await import('../models/User')).default;
    const user = await User.findById(userId);

    if (!user?.roleId) {
      return res.json({ success: true, data: [] });
    }

    const permissions = await RolePermission.find({ roleId: user.roleId })
      .populate('pageId', 'name nameEn path icon module');

    // Convert to JSON and ensure _id is present
    const permissionsJSON = ensureId(permissions);

    res.json({ success: true, data: permissionsJSON });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
