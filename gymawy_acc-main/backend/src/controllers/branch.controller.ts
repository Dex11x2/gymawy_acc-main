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

// الحصول على IP المستخدم الحالي
const getClientIP = (req: any): string => {
  // ترتيب الأولوية للحصول على IP الحقيقي
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // x-forwarded-for قد يحتوي على عدة IPs، نأخذ الأول
    return forwarded.split(',')[0].trim();
  }
  return req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         req.ip ||
         'unknown';
};

// تحديث IP الحالي للفرع
export const updateBranchIP = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const clientIP = getClientIP(req);

    if (clientIP === 'unknown' || clientIP === '::1' || clientIP === '127.0.0.1') {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن تحديد عنوان IP الحالي. تأكد أنك متصل من شبكة المكتب.'
      });
    }

    const branch = await Branch.findById(id);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'الفرع غير موجود' });
    }

    // إضافة IP للقائمة إذا لم يكن موجوداً
    if (!branch.allowedIPs.includes(clientIP)) {
      branch.allowedIPs.push(clientIP);
    }
    branch.lastIPUpdate = new Date();
    await branch.save();

    res.json({
      success: true,
      message: `تم تحديث IP بنجاح: ${clientIP}`,
      data: {
        currentIP: clientIP,
        allowedIPs: branch.allowedIPs,
        lastIPUpdate: branch.lastIPUpdate
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// حذف IP من قائمة الفرع
export const removeBranchIP = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { ip } = req.body;

    const branch = await Branch.findById(id);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'الفرع غير موجود' });
    }

    branch.allowedIPs = branch.allowedIPs.filter(existingIP => existingIP !== ip);
    await branch.save();

    res.json({
      success: true,
      message: 'تم حذف IP بنجاح',
      data: { allowedIPs: branch.allowedIPs }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// الحصول على IP الحالي للمستخدم
export const getCurrentIP = async (req: any, res: Response) => {
  try {
    const clientIP = getClientIP(req);
    res.json({ success: true, data: { ip: clientIP } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
