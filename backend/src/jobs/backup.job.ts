import * as cron from 'node-cron';
import { runBackup } from '../scripts/backupMongo';

let backupCronJob: cron.ScheduledTask | null = null;

// جدول النسخ الاحتياطي اليومي لقاعدة البيانات
export const startBackupJob = () => {
  // ممكن تعطيله بـ BACKUP_ENABLED=false، أو تغيير التوقيت بـ BACKUP_CRON
  if (process.env.BACKUP_ENABLED === 'false') {
    console.log('⏸️  النسخ الاحتياطي التلقائي معطّل (BACKUP_ENABLED=false)');
    return;
  }

  const cronExpr = process.env.BACKUP_CRON || '0 3 * * *'; // كل يوم 3:00 صباحاً

  if (backupCronJob) {
    backupCronJob.stop();
    backupCronJob = null;
  }

  if (!cron.validate(cronExpr)) {
    console.error(`❌ تعبير cron غير صالح للنسخ الاحتياطي: "${cronExpr}" — تم استخدام الافتراضي 0 3 * * *`);
  }

  backupCronJob = cron.schedule(cron.validate(cronExpr) ? cronExpr : '0 3 * * *', async () => {
    console.log('⏰ بدء النسخة الاحتياطية اليومية لقاعدة البيانات...');
    try {
      const r = await runBackup();
      console.log(`✅ تمت النسخة الاحتياطية: ${r.totalDocuments} مستند في ${r.totalCollections} collection (${(r.totalBytes / 1024 / 1024).toFixed(2)} MB) → ${r.outDir}`);
    } catch (err) {
      console.error('❌ فشلت النسخة الاحتياطية اليومية:', err);
    }
  }, {
    timezone: 'Africa/Cairo',
  });

  console.log(`✅ تم جدولة النسخ الاحتياطي اليومي (${cronExpr} — توقيت القاهرة)`);
};

export const stopBackupJob = () => {
  if (backupCronJob) {
    backupCronJob.stop();
    backupCronJob = null;
  }
};
