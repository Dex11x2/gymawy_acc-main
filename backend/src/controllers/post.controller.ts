import { Request, Response } from 'express';
import Post from '../models/Post';
import { notifyNewPost, createNotification } from '../services/notification.service';

export const getAll = async (req: any, res: Response) => {
  try {
    // ✅ FIXED: Managers see ALL posts, regular employees see only their company's posts
    const managerRoles = ['dev', 'administrative_manager', 'general_manager'];
    const filter = managerRoles.includes(req.user?.role)
      ? {}  // Managers see all posts
      : { companyId: req.user?.companyId }; // Regular employees see only their company

    const posts = await Post.find(filter)
      .populate('authorId', 'name avatar')
      .sort({ pinned: -1, createdAt: -1 }); // المثبّت أولاً

    const formattedPosts = posts.map(post => ({
      ...post.toObject(),
      id: post._id,
      authorName: (post.authorId as any)?.name || 'مجهول',
      authorAvatar: (post.authorId as any)?.avatar || ''
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

    // إشعار لكل من لديه صلاحية المنشورات (بصوت لحظي)
    const preview = (req.body.content || '').replace(/\s+/g, ' ').trim().slice(0, 60) || 'منشور جديد';
    await notifyNewPost(preview, req.user.name || 'زميل', req.user.companyId, req.app.get('io'));

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
    const user = await User.findById(req.user.id || req.user.userId);

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

    // إشعار لصاحب المنشور لما حد يعلّق (لو مش هو نفسه)
    const authorId = (post.authorId as any)?.toString();
    if (authorId && authorId !== (user._id as any).toString()) {
      await createNotification({
        userId: authorId,
        title: '💬 تعليق جديد على منشورك',
        message: `${user.name}: ${content}`,
        type: 'post',
        link: '/posts',
        senderId: (user._id as any).toString(),
        senderName: user.name
      }, req.app.get('io'));
    }

    res.json(post);
  } catch (error: any) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: error.message });
  }
};

// تفاعل بإيموجي (تبديل — إيموجي واحد لكل مستخدم)
export const react = async (req: any, res: Response) => {
  try {
    const { emoji } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    const userId = String(req.user.id || req.user._id);
    const list: any[] = (post.reactions as any) || [];
    const mine = list.find((r) => String(r.userId) === userId);
    if (mine && mine.emoji === emoji) {
      post.reactions = list.filter((r) => String(r.userId) !== userId) as any; // إلغاء
    } else if (mine) {
      mine.emoji = emoji; // تغيير
    } else {
      list.push({ userId: req.user.id || req.user._id, emoji });
      post.reactions = list as any;
    }
    await post.save();
    res.json(post);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// تثبيت/إلغاء تثبيت (المدراء فقط)
export const togglePin = async (req: any, res: Response) => {
  try {
    const managerRoles = ['dev', 'general_manager', 'administrative_manager'];
    if (!managerRoles.includes(req.user?.role)) return res.status(403).json({ message: 'المدراء فقط يقدروا يثبّتوا' });
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    post.pinned = !post.pinned;
    await post.save();
    res.json(post);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// التصويت في استطلاع (اختيار واحد — قابل للتبديل)
export const votePoll = async (req: any, res: Response) => {
  try {
    const { optionId } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post || !post.poll || !post.poll.options?.length) return res.status(404).json({ message: 'لا يوجد استطلاع' });
    const userId = String(req.user.id || req.user._id);
    post.poll.options.forEach((opt: any) => {
      opt.votes = (opt.votes || []).filter((v: any) => String(v) !== userId); // شيل صوته من الكل
      if (opt.id === optionId) opt.votes.push(req.user.id || req.user._id); // وحطه في المختار
    });
    post.markModified('poll');
    await post.save();
    res.json(post);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
