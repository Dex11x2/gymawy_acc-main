import { Response } from 'express';
import RolePermission from '../models/RolePermission';
import Role from '../models/Role';
import Page from '../models/Page';
import { ensureId } from '../utils/mongooseHelper';
import { getRoleLevel, canEditTargetLevel } from '../utils/permissions.util';

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

    // Hierarchy: editor can only grant permissions to roles strictly below them
    const targetRole = await Role.findById(roleId);
    if (!targetRole) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }
    const editorLevel = getRoleLevel(req.user?.role);
    if (!canEditTargetLevel(editorLevel, targetRole.level)) {
      return res.status(403).json({
        success: false,
        message: 'لا يمكنك تعديل صلاحيات دور بنفس مستواك أو أعلى',
      });
    }

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

/** Create a new Page (permission target). Super admin only. */
export const createPage = async (req: any, res: Response) => {
  try {
    const { name, nameEn, path, icon, module } = req.body;
    if (!name || !nameEn || !path || !module) {
      return res.status(400).json({ success: false, message: 'name, nameEn, path, module مطلوبين' });
    }
    const exists = await Page.findOne({ module });
    if (exists) {
      return res.status(409).json({ success: false, message: 'Module name already exists' });
    }
    const page = await Page.create({ name, nameEn, path, icon: icon || '📄', module });
    res.status(201).json({ success: true, data: page });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/** Update an existing Page. Super admin only. */
export const updatePage = async (req: any, res: Response) => {
  try {
    const { name, nameEn, path, icon } = req.body;
    const update: any = {};
    if (name !== undefined) update.name = name;
    if (nameEn !== undefined) update.nameEn = nameEn;
    if (path !== undefined) update.path = path;
    if (icon !== undefined) update.icon = icon;
    const page = await Page.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!page) return res.status(404).json({ success: false, message: 'Page not found' });
    res.json({ success: true, data: page });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/** Delete a Page (and clean up its RolePermission rows). Super admin only. */
export const deletePage = async (req: any, res: Response) => {
  try {
    const page = await Page.findByIdAndDelete(req.params.id);
    if (!page) return res.status(404).json({ success: false, message: 'Page not found' });
    await RolePermission.deleteMany({ pageId: req.params.id });
    res.json({ success: true, message: 'Page deleted and related role-permissions cleared' });
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
