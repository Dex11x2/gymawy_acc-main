import { Request, Response } from 'express';
import Task from '../models/Task';
import Employee from '../models/Employee';
import User from '../models/User';
import { createNotification } from '../services/notification.service';

// حوّل معرّف (موظف أو مستخدم) إلى معرّف مستخدم — الإشعارات والغرف بتستخدم معرّف المستخدم
const employeeToUserId = async (id: any): Promise<string | null> => {
  if (!id) return null;
  try {
    const emp = await Employee.findById(id).select('userId');
    if (emp?.userId) return (emp.userId as any).toString();
    // ربما كان معرّف مستخدم أصلاً (مثلاً مدير بدون سجل موظف)
    const user = await User.findById(id).select('_id');
    return user ? (user._id as any).toString() : null;
  } catch {
    return null;
  }
};

// علّم أن مستخدماً معيّناً شاف آخر نشاط في التسك (upsert)
const markSeenFor = async (taskId: any, userId: string) => {
  if (!userId) return;
  const now = new Date();
  const upd = await Task.updateOne(
    { _id: taskId, 'seenBy.userId': userId },
    { $set: { 'seenBy.$.seenAt': now } }
  );
  if (!upd.matchedCount) {
    await Task.updateOne({ _id: taskId }, { $push: { seenBy: { userId, seenAt: now } } });
  }
};

export const getAll = async (req: any, res: Response) => {
  try {
    // ✅ المدراء يشوفوا كل التسكات، الموظف يشوف تسكات شركته
    const managerRoles = ['dev', 'administrative_manager', 'general_manager'];
    const filter = managerRoles.includes(req.user?.role)
      ? {}
      : { companyId: req.user?.companyId };

    const tasks = await Task.find(filter).populate('assignedTo assignedBy');
    res.json(tasks);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req: any, res: Response) => {
  try {
    const actorId = (req.user._id || req.user.id).toString();
    const actorName = req.user.name || 'مستخدم';

    const task = await Task.create({
      ...req.body,
      comments: [],
      activities: [{
        byId: actorId,
        byName: actorName,
        kind: 'created',
        detail: `أنشأ المهمة "${req.body.title || ''}"`,
        createdAt: new Date()
      }],
      // المُنشئ شاف المهمة تلقائياً؛ المكلَّف لسه
      seenBy: [{ userId: actorId, seenAt: new Date() }]
    });

    const populatedTask = await Task.findById(task._id).populate('assignedTo assignedBy');

    // إشعار للموظف المكلّف (رابط يفتح المهمة نفسها)
    if (task.assignedTo) {
      const assignedToUserId = await employeeToUserId(task.assignedTo);
      const io = req.app.get('io');
      if (assignedToUserId && assignedToUserId !== actorId) {
        await createNotification({
          userId: assignedToUserId,
          title: '✅ مهمة جديدة',
          message: `كلّفك ${actorName} بمهمة: ${task.title}`,
          type: 'task',
          link: `/tasks?task=${task._id}`,
          senderId: actorId,
          senderName: actorName
        }, io);
      }
    }

    res.status(201).json(populatedTask);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getById = async (req: Request, res: Response) => {
  try {
    const task = await Task.findById(req.params.id).populate('assignedTo assignedBy');
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req: any, res: Response) => {
  try {
    const oldTask = await Task.findById(req.params.id);
    if (!oldTask) return res.status(404).json({ message: 'Task not found' });

    const actorId = (req.user._id || req.user.id).toString();
    const actorName = req.user.name || 'مستخدم';

    // اكتشف التغييرات وابنِ سجل نشاط لكل تغيير
    const statusText: Record<string, string> = {
      pending: 'معلقة', in_progress: 'قيد التنفيذ', completed: 'مكتملة', cancelled: 'ملغية'
    };
    const priorityText: Record<string, string> = { low: 'منخفضة', medium: 'متوسطة', high: 'عالية' };
    const activities: any[] = [];
    const changeSummaries: string[] = [];

    if (req.body.status !== undefined && req.body.status !== oldTask.status) {
      const d = `غيّر الحالة إلى «${statusText[req.body.status] || req.body.status}»`;
      activities.push({ byId: actorId, byName: actorName, kind: 'status', detail: d, createdAt: new Date() });
      changeSummaries.push(d);
    }
    if (req.body.priority !== undefined && req.body.priority !== oldTask.priority) {
      const d = `غيّر الأولوية إلى «${priorityText[req.body.priority] || req.body.priority}»`;
      activities.push({ byId: actorId, byName: actorName, kind: 'priority', detail: d, createdAt: new Date() });
      changeSummaries.push(d);
    }
    if (req.body.dueDate !== undefined && new Date(req.body.dueDate).getTime() !== new Date(oldTask.dueDate).getTime()) {
      const d = `غيّر تاريخ الاستحقاق إلى ${new Date(req.body.dueDate).toLocaleDateString('ar-EG')}`;
      activities.push({ byId: actorId, byName: actorName, kind: 'due', detail: d, createdAt: new Date() });
      changeSummaries.push(d);
    }
    if (req.body.title !== undefined && req.body.title !== oldTask.title) {
      const d = `عدّل العنوان`;
      activities.push({ byId: actorId, byName: actorName, kind: 'edit', detail: d, createdAt: new Date() });
      changeSummaries.push(d);
    }
    if (req.body.description !== undefined && req.body.description !== oldTask.description) {
      const d = `عدّل الوصف`;
      activities.push({ byId: actorId, byName: actorName, kind: 'edit', detail: d, createdAt: new Date() });
      changeSummaries.push(d);
    }
    if (req.body.assignedTo !== undefined && String(req.body.assignedTo) !== String(oldTask.assignedTo)) {
      const d = `أعاد إسناد المهمة`;
      activities.push({ byId: actorId, byName: actorName, kind: 'reassign', detail: d, createdAt: new Date() });
      changeSummaries.push(d);
    }

    const updateOps: any = { ...req.body };
    if (activities.length) updateOps.$push = { activities: { $each: activities } };

    const task = await Task.findByIdAndUpdate(req.params.id, updateOps, { new: true }).populate('assignedTo assignedBy');

    // الفاعل شاف التغيير تلقائياً (عشان جرسه ما يضيّش)
    if (activities.length) await markSeenFor(req.params.id, actorId);

    // إشعار الطرف الآخر عند أي تغيير
    if (changeSummaries.length) {
      const assignedToUserId = await employeeToUserId(oldTask.assignedTo);
      const assignedByUserId = await employeeToUserId(oldTask.assignedBy);
      const notifyUserId = assignedByUserId === actorId ? assignedToUserId : assignedByUserId;

      if (notifyUserId && notifyUserId !== actorId) {
        const io = req.app.get('io');
        await createNotification({
          userId: notifyUserId,
          title: `📋 تحديث على «${oldTask.title}»`,
          message: `${actorName}: ${changeSummaries.join('، ')}`,
          type: 'task',
          link: `/tasks?task=${oldTask._id}`,
          senderId: actorId,
          senderName: actorName
        }, io);
      }
    }

    res.json(task);
  } catch (error: any) {
    console.error('Task update error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const addComment = async (req: any, res: Response) => {
  try {
    const { content } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const actorId = (req.user._id || req.user.id).toString();
    const actorName = req.user.name || 'مستخدم';

    const comment = {
      id: Date.now().toString(),
      authorId: actorId,
      authorName: actorName,
      content,
      createdAt: new Date()
    };

    task.comments.push(comment as any);
    task.activities.push({
      byId: actorId,
      byName: actorName,
      kind: 'comment',
      detail: `أضاف تعليقاً: ${content}`,
      createdAt: new Date()
    } as any);
    await task.save();

    // الفاعل شاف؛ الطرف الآخر يتبلّغ
    await markSeenFor(task._id, actorId);

    const assignedToUserId = await employeeToUserId(task.assignedTo);
    const assignedByUserId = await employeeToUserId(task.assignedBy);
    const notifyUserId = assignedByUserId === actorId ? assignedToUserId : assignedByUserId;

    const io = req.app.get('io');
    if (notifyUserId && notifyUserId !== actorId) {
      if (io) {
        io.to(`user-${notifyUserId}`).emit('new-task-comment', { taskId: task._id, comment });
      }
      await createNotification({
        userId: notifyUserId,
        title: `💬 تعليق جديد من ${actorName}`,
        message: `علّق على «${task.title}»: ${content}`,
        type: 'task',
        link: `/tasks?task=${task._id}`,
        senderId: actorId,
        senderName: actorName
      }, io);
    }

    res.json(task);
  } catch (error: any) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: error.message });
  }
};

// علّم أن المستخدم الحالي شاف كل نشاط التسك (يطفّي الجرس)
export const markSeen = async (req: any, res: Response) => {
  try {
    const actorId = (req.user._id || req.user.id).toString();
    await markSeenFor(req.params.id, actorId);
    const task = await Task.findById(req.params.id).populate('assignedTo assignedBy');
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json({ message: 'Task deleted' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
