import { Response } from 'express';
import Review from '../models/Review';
import { notifyNewReview, resolveToUserId } from '../services/notification.service';

export const getAll = async (req: any, res: Response) => {
  try {
    const reviews = await Review.find({ companyId: req.user.companyId });
    res.json(reviews);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// تقييماتي (للموظف الحالي) — تقييم الشهر الحالي + المتوسط + آخر التقييمات
export const getMine = async (req: any, res: Response) => {
  try {
    const Employee = (await import('../models/Employee')).default;
    const emp = await Employee.findOne({ userId: req.user.id || req.user._id });
    if (!emp) return res.json({ current: null, average: 0, count: 0, reviews: [] });

    const reviews = await Review.find({ employeeId: emp._id })
      .populate('reviewerId', 'name')
      .sort({ year: -1, month: -1, createdAt: -1 });

    const now = new Date();
    const current = reviews.find((r: any) => r.month === now.getMonth() + 1 && r.year === now.getFullYear()) || null;
    const avg = reviews.length ? reviews.reduce((s: number, r: any) => s + (r.rating || 0), 0) / reviews.length : 0;
    res.json({ current, average: Math.round(avg * 10) / 10, count: reviews.length, reviews: reviews.slice(0, 12) });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req: any, res: Response) => {
  try {
    const review = await Review.create({
      ...req.body,
      companyId: req.user.companyId,
      reviewerId: req.user.id
    });

    // إشعار للموظف اللي اتقيّم (بصوت لحظي)
    const targetUserId = await resolveToUserId(review.employeeId);
    if (targetUserId && targetUserId !== String(req.user.id)) {
      await notifyNewReview(targetUserId, req.user.name || 'مقيّم', review.rating, req.app.get('io'));
    }

    res.status(201).json(review);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const update = async (req: any, res: Response) => {
  try {
    const review = await Review.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(review);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const remove = async (req: any, res: Response) => {
  try {
    await Review.findByIdAndDelete(req.params.id);
    res.json({ message: 'Review deleted' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const addComment = async (req: any, res: Response) => {
  try {
    const { content } = req.body;
    const review = await Review.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    const newComment = {
      authorId: req.user.userId,
      authorName: req.user.name || 'مستخدم',
      content,
      createdAt: new Date()
    };

    review.comments.push(newComment);
    await review.save();

    res.json(review);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
