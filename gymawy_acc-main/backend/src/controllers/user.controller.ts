import { Request, Response } from 'express';
import User from '../models/User';

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find({ isActive: true })
      .select('_id name email role avatar')
      .sort({ name: 1 });
    
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

const MANAGER_ROLES = ['dev', 'general_manager', 'administrative_manager'];
// الحقول اللي يقدر الموظف يعدّلها في حسابه هو (self-service)
const SELF_EDITABLE = ['name', 'email', 'phone', 'bio', 'position', 'birthDate', 'avatar'];

export const updateUser = async (req: any, res: Response) => {
  try {
    const targetId = req.params.id;
    const isSelf = String(req.user?.id || req.user?._id) === String(targetId);
    const isManager = MANAGER_ROLES.includes(req.user?.role);

    // موظف عادي يقدر يعدّل حسابه هو فقط، ومدير يقدر يعدّل الجميع
    if (!isSelf && !isManager) {
      return res.status(403).json({ message: 'غير مصرح لك بتعديل هذا المستخدم' });
    }

    let update: any = { ...req.body };

    // غير المدير: نسمح فقط بالحقول الشخصية الآمنة (نمنع role/permissions/isActive/companyId...)
    if (!isManager) {
      const filtered: any = {};
      for (const k of SELF_EDITABLE) if (k in update) filtered[k] = update[k];
      update = filtered;
    }

    // حتى المدير: منح دور "dev" مقصور على dev فقط
    if (update.role === 'dev' && req.user?.role !== 'dev') {
      delete update.role;
    }

    // Normalise per-user permission override: empty array means clear override
    if ('permissions' in update) {
      if (Array.isArray(update.permissions)) {
        const cleaned = update.permissions
          .filter((p: any) => p && p.module && Array.isArray(p.actions) && p.actions.length > 0)
          .map((p: any) => ({ module: p.module, actions: p.actions }));
        if (cleaned.length === 0) {
          delete update.permissions;
          update.$unset = { ...(update.$unset || {}), permissions: '' };
        } else {
          update.permissions = cleaned;
        }
      } else {
        delete update.permissions;
        update.$unset = { ...(update.$unset || {}), permissions: '' };
      }
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
