import { Response } from 'express';
import Branch from '../models/Branch';
import { ensureId } from '../utils/mongooseHelper';

export const getBranches = async (req: any, res: Response) => {
  try {
    const query: any = { isActive: true };
    if (req.user?.companyId) {
      query.companyId = req.user.companyId;
    }
    const branches = await Branch.find(query);

    // Convert to JSON and ensure _id is present
    const branchesJSON = ensureId(branches);

    res.json({ success: true, data: branchesJSON });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createBranch = async (req: any, res: Response) => {
  try {
    const { name, latitude, longitude, radius, address } = req.body;
    
    // Validate coordinates
    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({ success: false, message: 'خط العرض يجب أن يكون بين -90 و 90' });
    }
    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({ success: false, message: 'خط الطول يجب أن يكون بين -180 و 180' });
    }
    
    const branchData: any = {
      name,
      latitude,
      longitude,
      radius: radius || 100,
      address
    };
    
    // إضافة companyId فقط إذا كان موجوداً
    if (req.user?.companyId) {
      branchData.companyId = req.user.companyId;
    }
    
    const branch = await Branch.create(branchData);
    
    res.status(201).json({ success: true, data: branch });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateBranch = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const branch = await Branch.findByIdAndUpdate(id, req.body, { new: true });
    
    if (!branch) {
      return res.status(404).json({ success: false, message: 'الفرع غير موجود' });
    }
    
    res.json({ success: true, data: branch });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteBranch = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    await Branch.findByIdAndUpdate(id, { isActive: false });
    res.json({ success: true, message: 'تم حذف الفرع بنجاح' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
