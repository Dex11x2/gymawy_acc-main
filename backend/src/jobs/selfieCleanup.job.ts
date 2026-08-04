import * as cron from 'node-cron';
import AttendanceRecord from '../models/AttendanceRecord';

let cleanupCronJob: cron.ScheduledTask | null = null;

// حذف صور السيلفي للشهر السابق
export const cleanupOldSelfiePhotos = async () => {
  console.log('🧹 بدء تنظيف صور السيلفي القديمة...');

  try {
    // حساب أول يوم من الشهر الحالي
    const today = new Date();
    const firstDayOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    firstDayOfCurrentMonth.setUTCHours(0, 0, 0, 0);

    // البحث عن السجلات التي تحتوي على صور سيلفي وتاريخها قبل الشهر الحالي
    const result = await AttendanceRecord.updateMany(
      {
        selfiePhoto: { $exists: true, $ne: null },
        date: { $lt: firstDayOfCurrentMonth }
      },
      {
        $unset: {
          selfiePhoto: '',
          selfieTimestamp: '',
          selfieDeviceInfo: ''
        }
      }
    );

    console.log(`✅ تم تنظيف صور السيلفي: ${result.modifiedCount} سجل تم تحديثه`);
    console.log(`📅 تم حذف الصور قبل: ${firstDayOfCurrentMonth.toISOString().split('T')[0]}`);

    return {
      success: true,
      cleanedRecords: result.modifiedCount,
      cutoffDate: firstDayOfCurrentMonth
    };
  } catch (error: any) {
    console.error('❌ خطأ في تنظيف صور السيلفي:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// إحصائيات صور السيلفي
export const getSelfieStats = async () => {
  try {
    const today = new Date();
    const firstDayOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // إجمالي السجلات مع صور سيلفي
    const totalWithSelfie = await AttendanceRecord.countDocuments({
      selfiePhoto: { $exists: true, $ne: null }
    });

    // سجلات الشهر الحالي مع صور سيلفي
    const currentMonthWithSelfie = await AttendanceRecord.countDocuments({
      selfiePhoto: { $exists: true, $ne: null },
      date: { $gte: firstDayOfCurrentMonth }
    });

    // سجلات قديمة يمكن تنظيفها
    const oldRecordsToClean = await AttendanceRecord.countDocuments({
      selfiePhoto: { $exists: true, $ne: null },
      date: { $lt: firstDayOfCurrentMonth }
    });

    return {
      totalWithSelfie,
      currentMonthWithSelfie,
      oldRecordsToClean,
      cutoffDate: firstDayOfCurrentMonth
    };
  } catch (error: any) {
    console.error('❌ خطأ في جلب إحصائيات السيلفي:', error.message);
    return null;
  }
};

// بدء مهمة التنظيف الشهرية
export const startSelfieCleanupJob = () => {
  console.log('🔄 تهيئة مهمة تنظيف صور السيلفي...');

  // إلغاء المهمة السابقة إن وجدت
  if (cleanupCronJob) {
    cleanupCronJob.stop();
    cleanupCronJob = null;
  }

  // تشغيل في أول يوم من كل شهر الساعة 3 صباحاً
  // Cron: 0 3 1 * * = الدقيقة 0، الساعة 3، اليوم 1، كل شهر، كل يوم من الأسبوع
  cleanupCronJob = cron.schedule('0 3 1 * *', async () => {
    console.log('⏰ تشغيل مهمة تنظيف صور السيلفي الشهرية...');
    await cleanupOldSelfiePhotos();
  }, {
    timezone: 'Africa/Cairo'
  });

  console.log('✅ تم جدولة تنظيف صور السيلفي: أول يوم من كل شهر الساعة 3:00 صباحاً');
};

// إيقاف مهمة التنظيف
export const stopSelfieCleanupJob = () => {
  if (cleanupCronJob) {
    cleanupCronJob.stop();
    cleanupCronJob = null;
    console.log('⏸️ تم إيقاف مهمة تنظيف صور السيلفي');
  }
};
