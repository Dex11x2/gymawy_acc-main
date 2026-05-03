import Notification from '../models/Notification';
import User from '../models/User';

interface NotificationData {
  userId: string | string[];
  title: string;
  message: string;
  type: 'message' | 'task' | 'payment' | 'attendance' | 'complaint' | 'review' | 'post' | 'general';
  link?: string;
  senderId?: string;
  senderName?: string;
  companyId?: string;
}

/**
 * إنشاء إشعار لمستخدم واحد أو عدة مستخدمين
 */
export const createNotification = async (data: NotificationData, io?: any) => {
  try {
    const userIds = Array.isArray(data.userId) ? data.userId : [data.userId];
    const notifications = [];

    for (const userId of userIds) {
      const notification = await Notification.create({
        userId,
        companyId: data.companyId,
        title: data.title,
        message: data.message,
        type: data.type,
        link: data.link,
        senderId: data.senderId,
        senderName: data.senderName,
        isRead: false
      });

      notifications.push(notification);

      // إرسال عبر Socket.IO إذا كان متاحاً
      if (io) {
        io.to(`user-${userId}`).emit('notification', notification);
      }
    }

    console.log(`✅ تم إرسال ${notifications.length} إشعار`);
    return notifications;
  } catch (error) {
    console.error('❌ خطأ في إنشاء الإشعار:', error);
    throw error;
  }
};

/**
 * إرسال إشعار لجميع المستخدمين بصلاحية معينة
 */
export const notifyUsersByPermission = async (
  permission: string,
  data: Omit<NotificationData, 'userId'>,
  io?: any
) => {
  try {
    // جلب المستخدمين الذين لديهم صلاحية معينة
    const users = await User.find({
      $or: [
        { role: 'dev' },
        {
          'permissions': {
            $elemMatch: {
              module: permission,
              actions: { $in: ['read', 'view'] }
            }
          }
        }
      ]
    }).select('_id');

    const userIds = users.map(u => (u._id as any).toString());

    if (userIds.length === 0) {
      console.log(`⚠️ لا يوجد مستخدمين بصلاحية ${permission}`);
      return [];
    }

    return await createNotification({ ...data, userId: userIds }, io);
  } catch (error) {
    console.error('❌ خطأ في إرسال إشعار بالصلاحيات:', error);
    throw error;
  }
};

/**
 * إرسال إشعار لجميع المدراء
 */
export const notifyManagers = async (
  data: Omit<NotificationData, 'userId'>,
  io?: any
) => {
  try {
    const managers = await User.find({
      role: { $in: ['dev', 'general_manager', 'administrative_manager'] }
    }).select('_id');

    const userIds = managers.map(m => (m._id as any).toString());

    if (userIds.length === 0) {
      console.log('⚠️ لا يوجد مدراء');
      return [];
    }

    return await createNotification({ ...data, userId: userIds }, io);
  } catch (error) {
    console.error('❌ خطأ في إرسال إشعار للمدراء:', error);
    throw error;
  }
};

/**
 * إشعارات محددة لكل نوع من الأحداث
 */

// إشعار رسالة جديدة
export const notifyNewMessage = async (
  recipientId: string,
  senderId: string,
  senderName: string,
  messagePreview: string,
  io?: any
) => {
  return await createNotification({
    userId: recipientId,
    title: '💬 رسالة جديدة',
    message: `${senderName}: ${messagePreview}`,
    type: 'message',
    link: '/chat',
    senderId,
    senderName
  }, io);
};

// إشعار مهمة جديدة
export const notifyNewTask = async (
  assignedToId: string,
  taskTitle: string,
  assignedByName: string,
  assignedById: string,
  io?: any
) => {
  return await createNotification({
    userId: assignedToId,
    title: '✅ مهمة جديدة',
    message: `تم تكليفك بمهمة: ${taskTitle} من قبل ${assignedByName}`,
    type: 'task',
    link: '/tasks',
    senderId: assignedById,
    senderName: assignedByName
  }, io);
};

// إشعار صرف راتب
export const notifyPayrollPayment = async (
  employeeId: string,
  amount: number,
  month: string,
  io?: any
) => {
  return await createNotification({
    userId: employeeId,
    title: '💰 تم صرف الراتب',
    message: `تم صرف راتب شهر ${month} بقيمة ${amount} جنيه`,
    type: 'payment',
    link: '/payroll'
  }, io);
};

// إشعار حضور/غياب
export const notifyAttendanceIssue = async (
  employeeId: string,
  message: string,
  io?: any
) => {
  return await createNotification({
    userId: employeeId,
    title: '📅 تنبيه حضور',
    message,
    type: 'attendance',
    link: '/attendance-management'
  }, io);
};

// إشعار شكوى جديدة للمدراء
export const notifyNewComplaint = async (
  complaintTitle: string,
  submittedBy: string,
  companyId: string,
  io?: any
) => {
  return await notifyManagers({
    title: '⚠️ شكوى جديدة',
    message: `شكوى جديدة: ${complaintTitle} من ${submittedBy}`,
    type: 'complaint',
    link: '/complaints',
    companyId
  }, io);
};

// إشعار تقييم جديد
export const notifyNewReview = async (
  employeeId: string,
  reviewerName: string,
  rating: number,
  io?: any
) => {
  return await createNotification({
    userId: employeeId,
    title: '⭐ تقييم جديد',
    message: `تم تقييمك من قبل ${reviewerName} - التقييم: ${rating}/5`,
    type: 'review',
    link: '/reviews',
    senderName: reviewerName
  }, io);
};

// إشعار منشور جديد
export const notifyNewPost = async (
  postTitle: string,
  authorName: string,
  companyId: string,
  io?: any
) => {
  // إرسال لجميع المستخدمين الذين لديهم صلاحية posts
  return await notifyUsersByPermission('posts', {
    title: '📢 منشور جديد',
    message: `${authorName}: ${postTitle}`,
    type: 'post',
    link: '/posts',
    companyId,
    senderName: authorName
  }, io);
};

// إشعار عام
export const notifyGeneral = async (
  userIds: string | string[],
  title: string,
  message: string,
  link?: string,
  io?: any
) => {
  return await createNotification({
    userId: userIds,
    title,
    message,
    type: 'general',
    link
  }, io);
};
