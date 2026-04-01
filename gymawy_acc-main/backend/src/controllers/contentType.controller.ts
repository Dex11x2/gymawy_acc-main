import { Response } from 'express';
import ContentType from '../models/ContentType';
import MediaPrice from '../models/MediaPrice';

// Get all content types
export const getAll = async (req: any, res: Response) => {
  try {
    const { includeInactive } = req.query;
    const filter = includeInactive === 'true' ? {} : { isActive: true };

    const types = await ContentType.find(filter)
      .sort({ displayOrder: 1, nameAr: 1 });

    res.json(types);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Create new content type
export const create = async (req: any, res: Response) => {
  try {
    const { key, nameAr, nameEn, defaultPrice, currency, displayOrder } = req.body;

    // Validate key format
    if (!/^[a-z_]+$/.test(key)) {
      return res.status(400).json({
        message: 'المفتاح يجب أن يحتوي على أحرف إنجليزية صغيرة وشرطة سفلية فقط'
      });
    }

    // Check for duplicates
    const existing = await ContentType.findOne({ key });
    if (existing) {
      return res.status(400).json({ message: 'نوع المحتوى موجود بالفعل' });
    }

    const contentType = await ContentType.create({
      key,
      nameAr,
      nameEn,
      defaultPrice: defaultPrice || 0,
      currency: currency || 'SAR',
      displayOrder: displayOrder || 0,
      companyId: req.user?.companyId,
      createdBy: req.user?.userId,
      isActive: true
    });

    res.status(201).json(contentType);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Update content type
export const update = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { nameAr, nameEn, defaultPrice, currency, displayOrder } = req.body;

    // Don't allow changing 'key' to prevent breaking existing records
    const contentType = await ContentType.findByIdAndUpdate(
      id,
      { nameAr, nameEn, defaultPrice, currency, displayOrder },
      { new: true, runValidators: true }
    );

    if (!contentType) {
      return res.status(404).json({ message: 'نوع المحتوى غير موجود' });
    }

    res.json(contentType);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Soft delete
export const softDelete = async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    // Check if in use
    const inUse = await MediaPrice.exists({ type: id });
    if (inUse) {
      return res.status(400).json({
        message: 'لا يمكن حذف نوع محتوى مستخدم في أسعار الموظفين'
      });
    }

    const contentType = await ContentType.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!contentType) {
      return res.status(404).json({ message: 'نوع المحتوى غير موجود' });
    }

    res.json({ message: 'تم إلغاء تفعيل نوع المحتوى', contentType });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Restore
export const restore = async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const contentType = await ContentType.findByIdAndUpdate(
      id,
      { isActive: true },
      { new: true }
    );

    if (!contentType) {
      return res.status(404).json({ message: 'نوع المحتوى غير موجود' });
    }

    res.json({ message: 'تم تفعيل نوع المحتوى', contentType });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
