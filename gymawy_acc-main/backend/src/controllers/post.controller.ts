import { Request, Response } from 'express';
import Post from '../models/Post';

export const getAll = async (req: any, res: Response) => {
  try {
    // ✅ FIXED: Managers see ALL posts, regular employees see only their company's posts
    const managerRoles = ['super_admin', 'administrative_manager', 'general_manager'];
    const filter = managerRoles.includes(req.user?.role)
      ? {}  // Managers see all posts
      : { companyId: req.user?.companyId }; // Regular employees see only their company

    const posts = await Post.find(filter)
      .populate('authorId', 'name')
      .sort({ createdAt: -1 });

    const formattedPosts = posts.map(post => ({
      ...post.toObject(),
      id: post._id,
      authorName: (post.authorId as any)?.name || 'مجهول'
    }));

    res.json(formattedPosts);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req: any, res: Response) => {
  try {
    const post = await Post.create({ 
      ...req.body, 
      authorId: req.user.id 
    });
    res.status(201).json(post);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getById = async (req: Request, res: Response) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const post = await Post.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    const post = await Post.findByIdAndDelete(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json({ message: 'Post deleted' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const toggleLike = async (req: any, res: Response) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const userId = req.user.id;
    const alreadyLiked = (post.likes || []).some((id: any) => id.toString() === userId);

    if (alreadyLiked) {
      post.likes = post.likes.filter((id: any) => id.toString() !== userId);
    } else {
      post.likes = [...(post.likes || []), userId];
    }

    await post.save();
    res.json(post);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const addComment = async (req: any, res: Response) => {
  try {
    const { content } = req.body;
    const post = await Post.findById(req.params.id);
    
    if (!post) return res.status(404).json({ message: 'Post not found' });
    
    const User = (await import('../models/User')).default;
    const user = await User.findById(req.user.userId);
    
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const comment = {
      id: Date.now().toString(),
      authorId: user._id as any,
      authorName: user.name,
      content,
      createdAt: new Date()
    } as any;
    
    post.comments.push(comment);
    await post.save();
    
    res.json(post);
  } catch (error: any) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: error.message });
  }
};
