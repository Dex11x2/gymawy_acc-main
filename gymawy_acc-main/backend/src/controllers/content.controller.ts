import { Request, Response } from 'express';
import ContentAccount from '../models/ContentAccount';
import ContentItem from '../models/ContentItem';

// ========== Content Accounts ==========

export const getAccounts = async (req: any, res: Response) => {
  try {
    const managerRoles = ['super_admin', 'administrative_manager', 'general_manager'];
    const filter: any = { isActive: true };
    if (!managerRoles.includes(req.user?.role)) {
      filter.companyId = req.user?.companyId;
    }
    const accounts = await ContentAccount.find(filter).sort({ displayOrder: 1 });
    res.json(accounts);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createAccount = async (req: any, res: Response) => {
  try {
    const account = await ContentAccount.create({
      ...req.body,
      createdBy: req.user._id || req.user.id
    });
    res.status(201).json(account);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateAccount = async (req: any, res: Response) => {
  try {
    const account = await ContentAccount.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!account) return res.status(404).json({ message: 'Account not found' });
    res.json(account);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const account = await ContentAccount.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!account) return res.status(404).json({ message: 'Account not found' });
    res.json({ message: 'Account deleted' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ========== Content Items ==========

export const getItems = async (req: any, res: Response) => {
  try {
    const { accountId, month, year } = req.query;
    const filter: any = {};

    if (accountId) filter.accountId = accountId;

    // Filter by month/year for calendar view
    if (month && year) {
      const startDate = new Date(Number(year), Number(month) - 1, 1);
      const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59);
      filter.publishDate = { $gte: startDate, $lte: endDate };
    }

    const managerRoles = ['super_admin', 'administrative_manager', 'general_manager'];
    if (!managerRoles.includes(req.user?.role)) {
      filter.companyId = req.user?.companyId;
    }

    const items = await ContentItem.find(filter)
      .populate('assignedTo', 'name email')
      .populate('accountId', 'name')
      .sort({ publishDate: 1 });
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createItem = async (req: any, res: Response) => {
  try {
    const item = await ContentItem.create({
      ...req.body,
      createdBy: req.user._id || req.user.id
    });
    const populated = await ContentItem.findById(item._id)
      .populate('assignedTo', 'name email')
      .populate('accountId', 'name');
    res.status(201).json(populated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateItem = async (req: any, res: Response) => {
  try {
    const item = await ContentItem.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('assignedTo', 'name email')
      .populate('accountId', 'name');
    if (!item) return res.status(404).json({ message: 'Content item not found' });
    res.json(item);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteItem = async (req: Request, res: Response) => {
  try {
    const item = await ContentItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Content item not found' });
    res.json({ message: 'Content item deleted' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const bulkCreateItems = async (req: any, res: Response) => {
  try {
    const { items } = req.body;
    const userId = req.user._id || req.user.id;
    const itemsWithCreator = items.map((item: any) => ({ ...item, createdBy: userId }));
    const created = await ContentItem.insertMany(itemsWithCreator);
    const ids = created.map((c: any) => c._id);
    const populated = await ContentItem.find({ _id: { $in: ids } })
      .populate('assignedTo', 'name email')
      .populate('accountId', 'name')
      .sort({ publishDate: 1 });
    res.status(201).json(populated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
