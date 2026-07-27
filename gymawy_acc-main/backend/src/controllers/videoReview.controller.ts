import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import VideoReview from '../models/VideoReview';
import CalendarEntry from '../models/CalendarEntry';
import { createNotification } from '../services/notification.service';

const MANAGER_ROLES = ['dev', 'general_manager', 'administrative_manager'];

const isManager = (req: AuthRequest): boolean =>
  !!req.user?.role && MANAGER_ROLES.includes(req.user.role);

// Same authorization model as the content calendar (module: content_calendar).
const can = (req: AuthRequest, action: 'view' | 'create' | 'edit' | 'delete'): boolean => {
  if (isManager(req)) return true;
  const perms = req.user?.permissions || [];
  const mod = perms.find((p) => p.module === 'content_calendar');
  if (!mod) return false;
  if (action === 'view') return mod.actions.includes('view') || mod.actions.includes('read');
  return mod.actions.includes(action) || mod.actions.includes('edit') || mod.actions.includes('write');
};

const genId = () => Date.now().toString() + Math.round(Math.random() * 1e6);

const populateReview = (q: any) =>
  q.populate('createdById', 'name avatar')
    .populate('currentMentionId', 'name avatar')
    .populate('approvedById', 'name avatar')
    .populate('steps.byId', 'name avatar')
    .populate('steps.mentionId', 'name avatar');

// Notify a mentioned user (fire-and-forget).
const notifyMention = (req: AuthRequest, mentionId: any, title: string, message: string) => {
  try {
    if (!mentionId) return;
    const target = String(mentionId);
    if (target === String(req.user!.userId)) return; // don't notify yourself
    const io = (req.app as any)?.get?.('io');
    createNotification({
      userId: target,
      title,
      message,
      type: 'video_review',
      link: '/content-calendar',
      senderId: String(req.user!.userId),
      senderName: req.user!.name,
    }, io).catch(() => { /* non-critical */ });
  } catch { /* non-critical */ }
};

// ---------- Reviews ----------

export const getReviews = async (req: AuthRequest, res: Response) => {
  try {
    if (!can(req, 'view')) return res.status(403).json({ message: 'ليس لديك صلاحية' });
    const filter: any = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.account) filter.account = req.query.account;
    const reviews = await populateReview(VideoReview.find(filter).sort({ updatedAt: -1 }));
    res.json(reviews);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createReview = async (req: AuthRequest, res: Response) => {
  try {
    if (!can(req, 'create')) return res.status(403).json({ message: 'ليس لديك صلاحية لإضافة مراجعة' });
    const title = (req.body.title || '').trim();
    const link = (req.body.link || '').trim();
    if (!title) return res.status(400).json({ message: 'اسم الفيديو مطلوب' });

    const mentionId = req.body.mentionId || undefined;
    const review = await VideoReview.create({
      title,
      account: req.body.account || '',
      createdById: req.user!.userId,
      createdByName: req.user!.name,
      status: 'in_review',
      currentMentionId: mentionId,
      steps: [{
        id: genId(),
        byId: req.user!.userId,
        byName: req.user!.name,
        kind: 'upload',
        link: link || undefined,
        note: (req.body.note || '').trim() || undefined,
        mentionId,
        mentionName: req.body.mentionName,
        createdAt: new Date(),
      }],
    });

    notifyMention(req, mentionId, 'فيديو جديد للمراجعة', `تم إرسال «${title}» لمراجعتك`);
    const populated = await populateReview(VideoReview.findById(review._id));
    res.status(201).json(populated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const addStep = async (req: AuthRequest, res: Response) => {
  try {
    if (!can(req, 'edit')) return res.status(403).json({ message: 'ليس لديك صلاحية' });
    const review = await VideoReview.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'المراجعة غير موجودة' });
    if (review.status === 'approved') return res.status(400).json({ message: 'المراجعة معتمدة بالفعل' });

    const kind = req.body.kind === 'edit_request' ? 'edit_request' : 'revision';
    const link = (req.body.link || '').trim();
    const note = (req.body.note || '').trim();
    if (kind === 'revision' && !link) return res.status(400).json({ message: 'لينك النسخة مطلوب' });
    if (kind === 'edit_request' && !note) return res.status(400).json({ message: 'وصف التعديل المطلوب' });

    const mentionId = req.body.mentionId || undefined;
    review.steps.push({
      id: genId(),
      byId: req.user!.userId,
      byName: req.user!.name,
      kind,
      link: link || undefined,
      note: note || undefined,
      mentionId,
      mentionName: req.body.mentionName,
      createdAt: new Date(),
    } as any);
    review.status = kind === 'edit_request' ? 'changes_requested' : 'in_review';
    review.currentMentionId = mentionId as any;
    await review.save();

    const label = kind === 'edit_request' ? 'طلب تعديل' : 'نسخة جديدة';
    notifyMention(req, mentionId, label, `${label} على «${review.title}»`);
    const populated = await populateReview(VideoReview.findById(review._id));
    res.status(201).json(populated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const markSeen = async (req: AuthRequest, res: Response) => {
  try {
    if (!can(req, 'view')) return res.status(403).json({ message: 'ليس لديك صلاحية' });
    const review = await VideoReview.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'المراجعة غير موجودة' });

    const me = String(req.user!.userId);
    let changed = false;
    for (const step of review.steps) {
      if (step.mentionId && String(step.mentionId) === me && !step.seenAt) {
        step.seenAt = new Date();
        changed = true;
      }
    }
    if (changed) await review.save();
    const populated = await populateReview(VideoReview.findById(review._id));
    res.json(populated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const approve = async (req: AuthRequest, res: Response) => {
  try {
    const review = await VideoReview.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'المراجعة غير موجودة' });

    // Only managers or the person currently asked to review can approve.
    if (!isManager(req) && String(review.currentMentionId || '') !== String(req.user!.userId)) {
      return res.status(403).json({ message: 'الاعتماد متاح للمدير أو المُراجِع الحالي فقط' });
    }

    const entryId = req.body.entryId;
    if (!entryId) return res.status(400).json({ message: 'اختر صفًا في الجدول لربط الفيديو به' });
    const entry = await CalendarEntry.findById(entryId);
    if (!entry) return res.status(404).json({ message: 'الصف غير موجود' });

    // Final link = most recent step that carries a link.
    const finalLink = [...review.steps].reverse().find((s) => s.link)?.link || '';

    entry.videoLink = finalLink;
    if (req.body.publishDate) entry.publishDate = new Date(req.body.publishDate);
    if (Array.isArray(req.body.platforms)) entry.platforms = req.body.platforms;
    if (!entry.title && review.title) entry.title = review.title;
    entry.scheduled = true;
    await entry.save();

    review.status = 'approved';
    review.finalLink = finalLink;
    review.approvedById = req.user!.userId;
    review.approvedAt = new Date();
    review.linkedEntryId = entry._id as any;
    review.currentMentionId = undefined;
    review.steps.push({
      id: genId(),
      byId: req.user!.userId,
      byName: req.user!.name,
      kind: 'approve',
      note: (req.body.note || '').trim() || undefined,
      createdAt: new Date(),
    } as any);
    await review.save();

    // Notify all participants (creator + everyone who acted) except the approver.
    const participants = new Set<string>();
    participants.add(String(review.createdById));
    review.steps.forEach((s) => participants.add(String(s.byId)));
    participants.delete(String(req.user!.userId));
    if (participants.size) {
      const io = (req.app as any)?.get?.('io');
      createNotification({
        userId: Array.from(participants),
        title: 'تم اعتماد الفيديو',
        message: `تم اعتماد «${review.title}» وإضافته للجدول`,
        type: 'video_review',
        link: '/content-calendar',
        senderId: String(req.user!.userId),
        senderName: req.user!.name,
      }, io).catch(() => { /* non-critical */ });
    }

    const populated = await populateReview(VideoReview.findById(review._id));
    res.json(populated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteReview = async (req: AuthRequest, res: Response) => {
  try {
    if (!can(req, 'delete')) return res.status(403).json({ message: 'ليس لديك صلاحية للحذف' });
    const deleted = await VideoReview.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'المراجعة غير موجودة' });
    res.json({ message: 'تم الحذف' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
