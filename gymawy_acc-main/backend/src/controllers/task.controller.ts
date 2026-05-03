import { Request, Response } from 'express';
import Task from '../models/Task';
import User from '../models/User';
import Notification from '../models/Notification';
import { notifyNewTask } from '../services/notification.service';

export const getAll = async (req: any, res: Response) => {
  try {
    // ✅ FIXED: Managers see ALL tasks, regular employees see only their company's tasks
    const managerRoles = ['dev', 'administrative_manager', 'general_manager'];
    const filter = managerRoles.includes(req.user?.role)
      ? {}  // Managers see all tasks
      : { companyId: req.user?.companyId }; // Regular employees see only their company

    const tasks = await Task.find(filter).populate('assignedTo assignedBy');
    res.json(tasks);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req: any, res: Response) => {
  try {
    const task = await Task.create({
      ...req.body,
      comments: []
    });

    const populatedTask = await Task.findById(task._id).populate('assignedTo assignedBy');

    // إرسال إشعار للموظف المكلف بالمهمة
    if (task.assignedTo) {
      const assignedBy = await User.findById(req.user._id || req.user.id);
      const io = req.app.get('io');

      await notifyNewTask(
        task.assignedTo.toString(),
        task.title,
        assignedBy?.name || 'المدير',
        assignedBy?._id?.toString() || '',
        io
      );
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
    
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('assignedTo assignedBy');
    
    // إرسال إشعار عند تغيير الحالة
    if (req.body.status && req.body.status !== oldTask.status && oldTask.assignedBy) {
      const userId = req.user._id || req.user.id;
      const notifyUserId = oldTask.assignedBy.toString() === userId.toString() 
        ? oldTask.assignedTo.toString() 
        : oldTask.assignedBy.toString();
      
      if (notifyUserId && notifyUserId !== userId.toString()) {
        const statusText = req.body.status === 'completed' ? 'مكتملة ✅' : 
                          req.body.status === 'in_progress' ? 'قيد التنفيذ ⏳' : 
                          req.body.status === 'cancelled' ? 'ملغية ❌' : 'معلقة ⏸️';
        
        const notification = await Notification.create({
          userId: notifyUserId,
          title: '📋 تحديث حالة المهمة',
          message: `تم تحديث حالة المهمة "${oldTask.title}" إلى: ${statusText}`,
          type: 'task'
        });
        
        const io = req.app.get('io');
        if (io) {
          io.to(`user-${notifyUserId}`).emit('notification', notification);
        }
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
    
    const userId = req.user._id || req.user.id;
    const userName = req.user.name || 'User';
    
    const comment = {
      id: Date.now().toString(),
      authorId: userId,
      authorName: userName,
      content,
      createdAt: new Date()
    };
    
    task.comments.push(comment);
    await task.save();
    
    // إرسال إشعار للطرف الآخر
    const notifyUserId = task.assignedBy.toString() === userId 
      ? task.assignedTo.toString() 
      : task.assignedBy.toString();
    
    if (notifyUserId !== userId) {
      const notification = await Notification.create({
        userId: notifyUserId,
        title: '💬 تعليق جديد من ' + userName,
        message: `${userName} علّق على المهمة "${task.title}": ${content}`,
        type: 'task'
      });
      
      // إرسال عبر Socket.IO
      const io = req.app.get('io');
      if (io) {
        io.to(`user-${notifyUserId}`).emit('new-task-comment', {
          taskId: task._id,
          comment
        });
        io.to(`user-${notifyUserId}`).emit('notification', notification);
      }
    }
    
    res.json(task);
  } catch (error: any) {
    console.error('Add comment error:', error);
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
