import * as cron from 'node-cron';
import Company from '../models/Company';
import ReportSettings from '../models/ReportSettings';
import ReportLog from '../models/ReportLog';
import { generateDailyReport } from '../services/dailyReport.service';
import { sendDailyReport, ReportFormat } from '../services/email.service';

let currentCronJob: cron.ScheduledTask | null = null;

export const startDailyReportJob = async () => {
  console.log('🔄 تهيئة جدولة التقارير اليومية...');

  // إلغاء المهمة السابقة إن وجدت
  if (currentCronJob) {
    currentCronJob.stop();
    currentCronJob = null;
    console.log('⏸️ تم إيقاف المهمة السابقة');
  }

  try {
    // جلب الإعدادات
    const settings = await ReportSettings.findOne();

    if (!settings || !settings.enabled) {
      console.log('⏸️ التقارير اليومية معطلة');
      return;
    }

    const [hours, minutes] = settings.sendTime.split(':');
    const cronExpression = `${minutes} ${hours} * * *`;

    // جدولة المهمة اليومية
    currentCronJob = cron.schedule(cronExpression, async () => {
      await sendScheduledReport();
    }, {
      timezone: 'Africa/Cairo'
    });

    console.log(`✅ تم جدولة التقارير اليومية في الساعة ${settings.sendTime} (توقيت القاهرة)`);
    console.log(`📅 Cron Expression: ${cronExpression}`);
    console.log(`📧 Sender: ${settings.senderName || 'Default'} <${process.env.EMAIL_USER}>`);
    console.log(`👥 Active Recipients: ${settings.recipients.filter(r => r.enabled).length}`);
  } catch (error: any) {
    console.error('❌ خطأ في تهيئة جدولة التقارير:', error.message);
    console.error(error);
  }
};

const sendScheduledReport = async () => {
  console.log('📊 بدء إرسال التقارير اليومية المجدولة...');

  try {
    const settings = await ReportSettings.findOne();

    if (!settings || !settings.enabled) {
      console.log('⏸️ التقارير اليومية معطلة');
      return;
    }

    // التحقق من عدم الإرسال المكرر في نفس اليوم
    const lastSent = settings.lastSentAt;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (lastSent && lastSent >= today) {
      console.log('ℹ️ تم إرسال التقرير اليومي بالفعل');
      return;
    }

    // البحث عن الشركة أو إنشاء واحدة افتراضية
    let company = await Company.findOne();
    if (!company) {
      company = await Company.create({
        name: 'شركة جماوي',
        industry: 'محاسبة',
        isActive: true
      });
      console.log('✅ تم إنشاء شركة افتراضية');
    }

    // توليد التقرير
    const reportData = await generateDailyReport((company as any)._id.toString());

    // إرسال التقرير للمستلمين المفعلين
    const enabledRecipients = settings.recipients.filter(r => r.enabled && r.email);

    if (enabledRecipients.length === 0) {
      console.log('⚠️ لا يوجد مستلمين مفعلين للتقارير');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    // معلومات المرسل وصيغة التقرير من الإعدادات
    const senderName = settings.senderName || 'نظام جماوي';
    const senderEmail = settings.senderEmail || process.env.EMAIL_FROM;
    const reportFormat = (settings.reportFormat || 'both') as ReportFormat;

    for (const recipient of enabledRecipients) {
      try {
        await sendDailyReport(
          recipient.email,
          recipient.name,
          reportData,
          company.name,
          senderName,
          reportFormat,
          senderEmail
        );
        console.log(`✅ تم إرسال التقرير إلى: ${recipient.name} (${recipient.email})`);
        successCount++;

        // تسجيل النجاح
        await ReportLog.create({
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          status: 'success',
          sentAt: new Date(),
          reportType: 'scheduled'
        });
      } catch (error: any) {
        const errorMessage = error.message || 'خطأ غير معروف في إرسال التقرير';
        console.error(`❌ فشل إرسال التقرير إلى ${recipient.name} (${recipient.email}):`, errorMessage);
        console.error('تفاصيل الخطأ:', {
          code: error.code,
          command: error.command,
          response: error.response
        });
        failCount++;

        // تسجيل الفشل
        await ReportLog.create({
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          status: 'failed',
          errorMessage,
          sentAt: new Date(),
          reportType: 'scheduled'
        });
      }
    }

    // تحديث آخر وقت إرسال
    await ReportSettings.findByIdAndUpdate(settings._id, { lastSentAt: new Date() });

    console.log(`📧 تم إرسال التقارير: ${successCount} نجح، ${failCount} فشل`);
  } catch (error: any) {
    const errorMessage = error.message || 'خطأ غير معروف في إرسال التقارير المجدولة';
    console.error('❌ خطأ في إرسال التقارير المجدولة:', errorMessage);
    console.error('تفاصيل الخطأ الكاملة:', error);
  }
};

// دالة لإعادة جدولة التقارير (عند تغيير الوقت)
export const rescheduleReports = async () => {
  console.log('🔄 إعادة جدولة التقارير اليومية...');
  await startDailyReportJob();
};

// دالة لإرسال تقرير فوري (للاختبار) - تتجاوز فحص lastSentAt
export const sendImmediateReport = async () => {
  console.log('⚡ إرسال تقرير فوري...');

  try {
    const settings = await ReportSettings.findOne();

    if (!settings || !settings.enabled) {
      console.log('⏸️ التقارير اليومية معطلة');
      return;
    }

    // البحث عن الشركة أو إنشاء واحدة افتراضية
    let company = await Company.findOne();
    if (!company) {
      company = await Company.create({
        name: 'شركة جماوي',
        industry: 'محاسبة',
        isActive: true
      });
      console.log('✅ تم إنشاء شركة افتراضية');
    }

    // توليد التقرير
    const reportData = await generateDailyReport((company as any)._id.toString());

    // إرسال التقرير للمستلمين المفعلين
    const enabledRecipients = settings.recipients.filter(r => r.enabled && r.email);

    if (enabledRecipients.length === 0) {
      console.log('⚠️ لا يوجد مستلمين مفعلين للتقارير');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    const senderName = settings.senderName || 'نظام جماوي';
    const senderEmail = settings.senderEmail || process.env.EMAIL_FROM;
    const reportFormat = (settings.reportFormat || 'both') as ReportFormat;

    for (const recipient of enabledRecipients) {
      try {
        await sendDailyReport(
          recipient.email,
          recipient.name,
          reportData,
          company.name,
          senderName,
          reportFormat,
          senderEmail
        );
        console.log(`✅ تم إرسال التقرير إلى: ${recipient.name} (${recipient.email}) [${reportFormat}]`);
        successCount++;

        await ReportLog.create({
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          status: 'success',
          sentAt: new Date(),
          reportType: 'immediate'
        });
      } catch (error: any) {
        const errorMessage = error.message || 'خطأ غير معروف في إرسال التقرير';
        console.error(`❌ فشل إرسال التقرير إلى ${recipient.name} (${recipient.email}):`, errorMessage);
        console.error('تفاصيل الخطأ:', {
          code: error.code,
          command: error.command,
          response: error.response
        });
        failCount++;

        await ReportLog.create({
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          status: 'failed',
          errorMessage,
          sentAt: new Date(),
          reportType: 'immediate'
        });
      }
    }

    console.log(`📧 تم إرسال التقارير الفورية: ${successCount} نجح، ${failCount} فشل (صيغة: ${reportFormat})`);
  } catch (error: any) {
    const errorMessage = error.message || 'خطأ غير معروف في إرسال التقارير الفورية';
    console.error('❌ خطأ في إرسال التقارير الفورية:', errorMessage);
    console.error('تفاصيل الخطأ الكاملة:', error);
  }
};
