import * as cron from 'node-cron';
import Occasion from '../models/Occasion';
import User from '../models/User';
import { createNotification } from '../services/notification.service';

let occasionCronJob: cron.ScheduledTask | null = null;

const sameMonthDay = (a: Date, b: Date) => a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// معالجة مناسبات يوم معيّن (النهاردة أو بكرة) وإرسال التذكيرات
const notifyForDate = async (
  target: Date,
  when: 'today' | 'tomorrow',
  users: any[],
  allIds: string[],
  occasions: any[],
): Promise<number> => {
  const start = new Date(target); start.setHours(0, 0, 0, 0);
  const end = new Date(target); end.setHours(23, 59, 59, 999);
  const soon = when === 'tomorrow';
  let sent = 0;

  // 1) أعياد ميلاد الموظفين (من تاريخ الميلاد في الحساب)
  for (const u of users) {
    if (!u.birthDate) continue;
    if (!sameMonthDay(new Date(u.birthDate), target)) continue;
    const id = (u._id as any).toString();

    await createNotification({
      userId: id,
      title: soon ? '🎂 عيد ميلادك قرّب!' : '🎉 كل سنة وإنت طيّب!',
      message: soon
        ? 'بكرة عيد ميلادك 🎉 — استعد للتهنئة 🌹'
        : 'النهاردة عيد ميلادك 🎂 — كل سنة وإنت بخير من فريق جيماوي 🌹',
      type: 'general',
      link: '/occasions',
    });

    const others = allIds.filter((x) => x !== id);
    if (others.length) {
      await createNotification({
        userId: others,
        title: soon ? '🎂 عيد ميلاد قرّب' : '🎂 عيد ميلاد النهاردة',
        message: soon
          ? `فكّرة: بكرة عيد ميلاد ${u.name} — جهّزوا التهنئة 🎉`
          : `النهاردة عيد ميلاد ${u.name} — متنسوش تهنّوه 🎉`,
        type: 'general',
        link: '/occasions',
      });
    }
    sent++;
  }

  // 2) المناسبات المضافة (اليوم بالضبط، أو المتكررة بنفس الشهر/اليوم)
  for (const oc of occasions) {
    const d = new Date(oc.date);
    const matches = oc.isRecurring ? sameMonthDay(d, target) : (d >= start && d <= end);
    if (!matches) continue;

    const ownerId = (oc.createdBy as any)?._id?.toString() || (oc.createdBy as any)?.toString();
    const emoji = oc.type === 'birthday' ? '🎂' : oc.type === 'anniversary' ? '💐' : '📅';
    const prefix = soon ? 'تذكير: بكرة ' : '';

    if (ownerId && oc.type === 'birthday') {
      await createNotification({
        userId: ownerId,
        title: soon ? '🎂 عيد ميلادك قرّب!' : '🎉 كل سنة وإنت طيّب!',
        message: soon ? `بكرة ${oc.title} 🎉` : `${oc.description || oc.title} — كل سنة وإنت بخير 🌹`,
        type: 'general',
        link: '/occasions',
      });
    }

    const targets = ownerId ? allIds.filter((x) => x !== ownerId) : allIds;
    if (targets.length) {
      await createNotification({
        userId: targets,
        title: `${emoji} ${prefix}${oc.title}`,
        message: oc.description || (soon ? 'مناسبة بكرة 🎉' : 'مناسبة النهاردة 🎉'),
        type: 'general',
        link: '/occasions',
      });
    }
    sent++;
  }

  return sent;
};

// إرسال تذكيرات المناسبات: النهاردة + تنبيه قبلها بيوم (بكرة)
export const runOccasionReminders = async () => {
  const users = await User.find({ isActive: true }).select('_id name birthDate');
  const allIds = users.map((u) => (u._id as any).toString());
  if (allIds.length === 0) return 0;

  const occasions = await Occasion.find({}).populate('createdBy', 'name');

  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

  // تنبيه "قربت" قبلها بيوم، وتنبيه اليوم نفسه
  const soonCount = await notifyForDate(tomorrow, 'tomorrow', users, allIds, occasions);
  const todayCount = await notifyForDate(today, 'today', users, allIds, occasions);

  const total = soonCount + todayCount;
  if (total > 0) console.log(`✅ تذكيرات المناسبات: النهاردة ${todayCount}، بكرة ${soonCount}`);
  return total;
};

// جدولة يومية الساعة 8 صباحاً (توقيت القاهرة)
export const startOccasionReminderJob = () => {
  if (occasionCronJob) { occasionCronJob.stop(); occasionCronJob = null; }
  const cronExpr = process.env.OCCASION_CRON || '0 8 * * *';
  occasionCronJob = cron.schedule(cron.validate(cronExpr) ? cronExpr : '0 8 * * *', async () => {
    console.log('⏰ تشغيل تذكيرات المناسبات اليومية...');
    try { await runOccasionReminders(); } catch (e) { console.error('❌ خطأ في تذكيرات المناسبات:', e); }
  }, { timezone: 'Africa/Cairo' });
  console.log(`✅ تم جدولة تذكيرات المناسبات (${cronExpr} — توقيت القاهرة)`);
};

export const stopOccasionReminderJob = () => {
  if (occasionCronJob) { occasionCronJob.stop(); occasionCronJob = null; }
};
