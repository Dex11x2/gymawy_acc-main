import nodemailer from 'nodemailer';
import { DailyReportData } from './dailyReport.service';
import { generateReportPDF } from './pdfReport.service';

export type ReportFormat = 'pdf' | 'html' | 'both';

// إنشاء transporter كـ lazy initialization
let transporter: nodemailer.Transporter | null = null;

// التحقق من صحة إعدادات البريد الإلكتروني
const validateEmailConfig = (): { valid: boolean; error?: string } => {
  const host = process.env.EMAIL_HOST;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    return {
      valid: false,
      error: 'بيانات الاعتماد غير موجودة. يرجى التحقق من EMAIL_USER و EMAIL_PASS في ملف .env'
    };
  }

  if (!host) {
    return {
      valid: false,
      error: 'EMAIL_HOST غير محدد في ملف .env'
    };
  }

  // التحقق من صحة تنسيق البريد الإلكتروني
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (user && !emailRegex.test(user)) {
    return {
      valid: false,
      error: `تنسيق البريد الإلكتروني غير صحيح: ${user}`
    };
  }

  return { valid: true };
};

// إعادة تعيين transporter (مفيد عند تغيير الإعدادات)
export const resetTransporter = () => {
  if (transporter) {
    transporter.close();
    transporter = null;
    console.log('🔄 تم إعادة تعيين email transporter');
  }
};

const getTransporter = (): nodemailer.Transporter => {
  // التحقق من صحة الإعدادات أولاً
  const validation = validateEmailConfig();
  if (!validation.valid) {
    throw new Error(validation.error || 'إعدادات البريد الإلكتروني غير صحيحة');
  }

  if (!transporter) {
    const host = process.env.EMAIL_HOST || 'smtp-relay.SMTP_PROVIDER.com';
    const port = parseInt(process.env.EMAIL_PORT || '587');
    const user = process.env.EMAIL_USER!;
    const pass = process.env.EMAIL_PASS!;
    const isGmail = host.includes('gmail.com');

    console.log('📧 إنشاء email transporter مع الإعدادات التالية:');
    console.log('   HOST:', host);
    console.log('   PORT:', port);
    console.log('   USER:', user);
    console.log('   FROM:', process.env.EMAIL_FROM || user);
    console.log('   Gmail:', isGmail ? 'نعم' : 'لا');

    // إعدادات خاصة بـ Gmail
    const transporterOptions: any = {
      host,
      port,
      secure: port === 465, // Gmail port 465 يستخدم SSL
      auth: {
        user,
        pass
      }
    };

    // إعدادات TLS لـ Gmail
    if (isGmail) {
      transporterOptions.requireTLS = true;
      transporterOptions.tls = {
        rejectUnauthorized: false // للسماح بشهادات SSL غير موثوقة في بيئة التطوير
      };
    } else {
      // إعدادات عامة لخوادم SMTP الأخرى
      transporterOptions.requireTLS = port === 587;
      if (port === 587) {
        transporterOptions.tls = {
          rejectUnauthorized: false
        };
      }
    }

    transporter = nodemailer.createTransport(transporterOptions);
  }
  return transporter;
};

const generateReportHTML = (reportData: DailyReportData, companyName: string): string => {
  const { attendance, financial, tasks, alerts } = reportData;
  const date = reportData.date.toLocaleDateString('ar-EG', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .header p { margin: 10px 0 0; opacity: 0.9; }
    .content { padding: 30px; }
    .section { margin-bottom: 30px; }
    .section-title { font-size: 20px; font-weight: bold; color: #1f2937; margin-bottom: 15px; border-right: 4px solid #f59e0b; padding-right: 12px; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; }
    .stat-card { background: #f9fafb; border-radius: 8px; padding: 20px; text-align: center; border: 1px solid #e5e7eb; }
    .stat-value { font-size: 32px; font-weight: bold; color: #1f2937; margin: 10px 0; }
    .stat-label { color: #6b7280; font-size: 14px; }
    .alert-box { background: #fef3c7; border-right: 4px solid #f59e0b; padding: 15px; border-radius: 8px; margin-bottom: 10px; }
    .alert-box ul { margin: 10px 0; padding-right: 20px; }
    .alert-box li { margin: 5px 0; color: #92400e; }
    .positive { color: #059669; }
    .negative { color: #dc2626; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 التقرير اليومي</h1>
      <p>${companyName}</p>
      <p>${date}</p>
    </div>
    
    <div class="content">
      <div class="section">
        <div class="section-title">👥 الحضور والغياب</div>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">إجمالي الموظفين</div>
            <div class="stat-value">${attendance.totalEmployees}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">✅ حاضر</div>
            <div class="stat-value positive">${attendance.present}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">⏰ متأخر</div>
            <div class="stat-value" style="color: #f59e0b;">${attendance.late}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">❌ غائب</div>
            <div class="stat-value negative">${attendance.absent}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">🏝️ إجازة</div>
            <div class="stat-value" style="color: #3b82f6;">${attendance.onLeave}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">💰 الملخص المالي</div>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">📈 الإيرادات</div>
            <div class="stat-value positive">${financial.revenue.toLocaleString('ar-EG')} ج.م</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">📉 المصروفات</div>
            <div class="stat-value negative">${financial.expenses.toLocaleString('ar-EG')} ج.م</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">💵 صافي الربح</div>
            <div class="stat-value ${financial.netProfit >= 0 ? 'positive' : 'negative'}">
              ${financial.netProfit.toLocaleString('ar-EG')} ج.م
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">📋 المهام</div>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">✅ مكتملة اليوم</div>
            <div class="stat-value positive">${tasks.completed}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">⏳ قيد التنفيذ</div>
            <div class="stat-value" style="color: #f59e0b;">${tasks.pending}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">⚠️ متأخرة</div>
            <div class="stat-value negative">${tasks.overdue}</div>
          </div>
        </div>
      </div>

      ${alerts.length > 0 ? `
      <div class="section">
        <div class="section-title">🔔 التنبيهات المهمة</div>
        <div class="alert-box">
          <ul>
            ${alerts.map(alert => `<li>${alert}</li>`).join('')}
          </ul>
        </div>
      </div>
      ` : ''}
    </div>

    <div class="footer">
      <p>هذا تقرير تلقائي من نظام جماوي المحاسبي</p>
      <p>© ${new Date().getFullYear()} جميع الحقوق محفوظة</p>
    </div>
  </div>
</body>
</html>
  `;
};

export const sendDailyReport = async (
  email: string,
  name: string,
  reportData: DailyReportData,
  companyName: string,
  senderName?: string,
  reportFormat: ReportFormat = 'both',
  senderEmail?: string
): Promise<void> => {
  try {
    // التحقق من صحة البريد الإلكتروني للمستلم
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      throw new Error(`البريد الإلكتروني للمستلم غير صحيح: ${email}`);
    }

    const fromName = senderName || 'نظام جماوي';
    const fromEmail = senderEmail || process.env.EMAIL_FROM || process.env.EMAIL_USER;

    if (!fromEmail) {
      throw new Error('عنوان البريد الإلكتروني للمرسل غير محدد');
    }

    // التحقق من صحة بريد المرسل
    if (!emailRegex.test(fromEmail)) {
      throw new Error(`تنسيق بريد المرسل غير صحيح: ${fromEmail}`);
    }

    // تحضير المرفقات والمحتوى بناءً على الصيغة المطلوبة
    let html: string | undefined;
    let attachments: any[] = [];

    // إنشاء HTML إذا كان مطلوباً
    if (reportFormat === 'html' || reportFormat === 'both') {
      html = generateReportHTML(reportData, companyName);
    }

    // إنشاء PDF إذا كان مطلوباً
    if (reportFormat === 'pdf' || reportFormat === 'both') {
      try {
        const pdfBuffer = await generateReportPDF(reportData, companyName);
        const dateStr = reportData.date.toISOString().split('T')[0];
        attachments.push({
          filename: `تقرير-${dateStr}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        });
        console.log('📎 تم إنشاء مرفق PDF بنجاح');
      } catch (error: any) {
        console.error('❌ خطأ في إنشاء PDF:', error.message);
        // في حالة فشل إنشاء PDF، نرسل HTML فقط
        if (!html) {
          html = generateReportHTML(reportData, companyName);
        }
      }
    }

    // إذا كان PDF فقط بدون HTML، نضيف رسالة بسيطة
    if (reportFormat === 'pdf' && !html) {
      html = `
      <div dir="rtl" style="font-family: Arial; padding: 20px; text-align: center;">
        <h2>📊 التقرير اليومي</h2>
        <p>مرحباً ${name}،</p>
        <p>يرجى الاطلاع على التقرير اليومي المرفق بصيغة PDF.</p>
        <p style="color: #666; margin-top: 20px;">نظام جماوي المحاسبي</p>
      </div>
    `;
    }

    // الحصول على transporter والتحقق من الاتصال
    let mailTransporter = getTransporter();
    
    console.log(`🔄 التحقق من اتصال SMTP قبل الإرسال...`);
    try {
      await mailTransporter.verify();
      console.log('✅ تم التحقق من اتصال SMTP بنجاح');
    } catch (verifyError: any) {
      console.error('❌ فشل التحقق من اتصال SMTP:', verifyError.message);
      // محاولة إعادة تعيين transporter وإعادة المحاولة مرة واحدة
      console.log('🔄 محاولة إعادة تعيين transporter وإعادة المحاولة...');
      resetTransporter();
      mailTransporter = getTransporter();
      await mailTransporter.verify();
    }

    // إرسال البريد الإلكتروني
    console.log(`📤 جاري إرسال التقرير إلى ${email}...`);
    const info = await mailTransporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      sender: fromEmail,
      envelope: {
        from: fromEmail,
        to: email
      },
      to: email,
      subject: `📊 التقرير اليومي - ${reportData.date.toLocaleDateString('ar-EG')}`,
      html,
      attachments
    });

    console.log(`✅ تم إرسال البريد الإلكتروني بنجاح إلى ${email} (Message ID: ${info.messageId})`);
    console.log(`📧 الصيغة: ${reportFormat}`);
  } catch (error: any) {
    // تحسين رسائل الخطأ
    let errorMessage = 'فشل إرسال التقرير اليومي';
    
    if (error.message) {
      errorMessage = error.message;
    } else if (error.code) {
      // رموز أخطاء nodemailer الشائعة
      switch (error.code) {
        case 'EAUTH':
          errorMessage = 'فشل المصادقة. يرجى التحقق من EMAIL_USER و EMAIL_PASS في ملف .env';
          break;
        case 'ECONNECTION':
          errorMessage = 'فشل الاتصال بخادم البريد الإلكتروني. يرجى التحقق من EMAIL_HOST و EMAIL_PORT';
          break;
        case 'ETIMEDOUT':
          errorMessage = 'انتهت مهلة الاتصال بخادم البريد الإلكتروني';
          break;
        case 'EENVELOPE':
          errorMessage = 'خطأ في عنوان البريد الإلكتروني للمستلم أو المرسل';
          break;
        default:
          errorMessage = `خطأ في إرسال البريد: ${error.code} - ${error.message || 'خطأ غير معروف'}`;
      }
    }

    console.error(`❌ ${errorMessage}`);
    console.error('تفاصيل الخطأ:', {
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode
    });

    throw new Error(errorMessage);
  }
};
