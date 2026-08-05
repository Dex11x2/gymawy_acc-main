import { Request, Response } from 'express';
import Expense from '../models/Expense';

export const getAll = async (req: any, res: Response) => {
  try {
    const managerRoles = ['dev', 'administrative_manager', 'general_manager'];
    const filter: any = managerRoles.includes(req.user?.role)
      ? {}                                   // المدراء يشوفوا كل المصروفات
      : { companyId: req.user?.companyId };   // الموظف العادي يشوف بتاع شركته فقط

    // فلاتر اختيارية (متوافقة مع القديم — لو مفيش أي param السلوك زي ما هو)
    const { search, type, currency, dateFrom, dateTo, page, limit } = req.query;

    if (type) filter.type = type;
    if (currency) filter.currency = currency;
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo) { const d = new Date(dateTo); d.setHours(23, 59, 59, 999); filter.date.$lte = d; }
    }
    if (search) {
      const rx = new RegExp(String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ title: rx }, { description: rx }, { category: rx }, { customerName: rx }];
    }

    const query = Expense.find(filter)
      .populate('departmentId createdBy')
      .sort({ date: -1, createdAt: -1 });

    // Pagination اختياري: يتفعّل فقط لو اتبعت page أو limit
    if (page || limit) {
      const pageNum = Math.max(1, parseInt(String(page || '1'), 10) || 1);
      const pageSize = Math.min(200, Math.max(1, parseInt(String(limit || '50'), 10) || 50));
      const total = await Expense.countDocuments(filter);
      const data = await query.skip((pageNum - 1) * pageSize).limit(pageSize);
      return res.json({ data, total, page: pageNum, pages: Math.ceil(total / pageSize) });
    }

    const expenses = await query;
    res.json(expenses);
  } catch (error: any) {
    console.error('❌ Error in expense.getAll:', error);
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req: any, res: Response) => {
  try {
    const expense = await Expense.create({ ...req.body, createdBy: req.user.id, companyId: req.user.companyId });
    res.status(201).json(expense);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getById = async (req: Request, res: Response) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    res.json(expense);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const expense = await Expense.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    res.json(expense);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    const expense = await Expense.findByIdAndUpdate(req.params.id, { isDeleted: true, deletedAt: new Date() }, { new: true });
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    res.json({ message: 'Expense deleted' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
