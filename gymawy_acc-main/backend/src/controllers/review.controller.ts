import { Response } from 'express';
import Review from '../models/Review';

export const getAll = async (req: any, res: Response) => {
  try {
    const reviews = await Review.find({ companyId: req.user.companyId });
    res.json(reviews);
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
