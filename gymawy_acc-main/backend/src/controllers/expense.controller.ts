import { Request, Response } from 'express';
import Expense from '../models/Expense';

export const getAll = async (req: any, res: Response) => {
  try {
    console.log('📡 GET /expenses Request:');
    console.log('  User ID:', req.user?.id);
    console.log('  User Role:', req.user?.role);
    console.log('  User CompanyId:', req.user?.companyId);

    const filter = req.user?.role === 'super_admin' ? {} : { companyId: req.user?.companyId };
    console.log('  Applied Filter:', JSON.stringify(filter));

    // ترتيب بالأحدث أولاً
    const expenses = await Expense.find(filter)
      .populate('departmentId createdBy')
      .sort({ date: -1, createdAt: -1 });

    console.log('✅ Expenses Query Result:', {
      count: expenses.length,
      firstExpense: expenses[0] ? {
        id: expenses[0]._id,
        amount: expenses[0].amount,
        companyId: expenses[0].companyId
      } : null
    });

    res.json(expenses);
  } catch (error: any) {
    console.error('❌ Error in expense.getAll:', error);
    res.status(500).json({
      message: error.message,
      error: error.toString(),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    res.json({ message: 'Expense deleted' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
