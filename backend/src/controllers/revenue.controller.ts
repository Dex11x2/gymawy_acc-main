import { Request, Response } from 'express';
import Revenue from '../models/Revenue';

export const getAll = async (req: any, res: Response) => {
  try {
    // المدراء يشوفوا كل الإيرادات، الموظف العادي بتاع شركته فقط
    const managerRoles = ['dev', 'administrative_manager', 'general_manager'];
    const filter: any = managerRoles.includes(req.user?.role)
      ? {}
      : { companyId: req.user?.companyId };

    // فلاتر اختيارية (متوافقة مع القديم — لو مفيش param السلوك زي ما هو)
    const { search, currency, dateFrom, dateTo, page, limit } = req.query;
    if (currency) filter.currency = currency;
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo) { const d = new Date(dateTo); d.setHours(23, 59, 59, 999); filter.date.$lte = d; }
    }
    if (search) {
      const rx = new RegExp(String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ title: rx }, { description: rx }, { category: rx }, { source: rx }];
    }

    const q = Revenue.find(filter).populate('departmentId createdBy').sort({ date: -1, createdAt: -1 });

    if (page || limit) {
      const pageNum = Math.max(1, parseInt(String(page || '1'), 10) || 1);
      const pageSize = Math.min(200, Math.max(1, parseInt(String(limit || '50'), 10) || 50));
      const total = await Revenue.countDocuments(filter);
      const data = await q.skip((pageNum - 1) * pageSize).limit(pageSize);
      return res.json({ data, total, page: pageNum, pages: Math.ceil(total / pageSize) });
    }

    const revenues = await q;
    res.json(revenues);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req: any, res: Response) => {
  try {
    const revenue = await Revenue.create({ ...req.body, createdBy: req.user.id, companyId: req.user.companyId });
    res.status(201).json(revenue);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getById = async (req: Request, res: Response) => {
  try {
    const revenue = await Revenue.findById(req.params.id);
    if (!revenue) return res.status(404).json({ message: 'Revenue not found' });
    res.json(revenue);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const revenue = await Revenue.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!revenue) return res.status(404).json({ message: 'Revenue not found' });
    res.json(revenue);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    const revenue = await Revenue.findByIdAndUpdate(req.params.id, { isDeleted: true, deletedAt: new Date() }, { new: true });
    if (!revenue) return res.status(404).json({ message: 'Revenue not found' });
    res.json({ message: 'Revenue deleted' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
