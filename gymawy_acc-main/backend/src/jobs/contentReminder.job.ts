import * as cron from 'node-cron';
import CalendarEntry from '../models/CalendarEntry';
import { createNotification } from '../services/notification.service';

/**
 * Every morning (09:00 Cairo time), remind assignees about content scheduled to
 * publish today that is not a rest day and not marked done.
 */
export const startContentReminderJob = () => {
  cron.schedule('0 9 * * *', async () => {
    await sendTodayReminders();
  }, { timezone: 'Africa/Cairo' });
  console.log('✅ تم جدولة تذكيرات تقويم المحتوى (يوميًا 9 صباحًا - توقيت القاهرة)');
};

const sendTodayReminders = async () => {
  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const entries = await CalendarEntry.find({
      publishDate: { $gte: start, $lte: end },
      isRest: false,
      done: false,
    }).populate('assigneeId', 'name');

    let sent = 0;
    for (const e of entries as any[]) {
      const assignee = e.assigneeId ? String(e.assigneeId._id || e.assigneeId) : '';
      if (!assignee) continue; // no assignee to remind
      await createNotification({
        userId: assignee,
        title: 'تذكير: محتوى مجدول اليوم',
        message: `«${e.title || 'بدون عنوان'}» مجدول للنشر اليوم`,
        type: 'general',
        link: e.videoLink || '/content-calendar',
      });
      sent++;
    }
    console.log(`📅 تذكيرات تقويم المحتوى: ${entries.length} عنصر اليوم، أُرسل ${sent} تذكير`);
  } catch (error) {
    console.error('❌ خطأ في تذكيرات تقويم المحتوى:', error);
  }
};
