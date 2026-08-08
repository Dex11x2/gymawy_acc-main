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
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const CUR: Record<string, { name: string; sym: string }> = {
    EGP: { name: 'جنيه مصري', sym: 'ج.م' },
    SAR: { name: 'ريال سعودي', sym: 'ر.س' },
    USD: { name: 'دولار', sym: '$' },
    AED: { name: 'درهم', sym: 'د.إ' },
  };
  const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

  // خلية إحصائية (بطاقة داخل <td>)
  const statCell = (label: string, value: string | number, color: string) => `
    <td width="20%" align="center" style="padding:6px;">
      <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;padding:14px 8px;">
        <div style="font-size:13px;color:#6B7280;margin-bottom:6px;">${label}</div>
        <div style="font-size:24px;font-weight:bold;color:${color};line-height:1;">${value}</div>
      </div>
    </td>`;

  const sectionTitle = (t: string) =>
    `<h2 style="font-size:17px;font-weight:bold;color:#111827;margin:0 0 12px;border-right:4px solid #F97316;padding-right:10px;">${t}</h2>`;

  // جدول الملخص المالي لكل عملة
  const financialRows = (financial.byCurrency || []).map((c) => {
    const m = CUR[c.currency] || { name: c.currency, sym: '' };
    const netColor = c.net >= 0 ? '#059669' : '#DC2626';
    return `<tr>
      <td style="padding:10px 12px;border-bottom:1px solid #F3F4F6;font-weight:600;color:#111827;">${m.name}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #F3F4F6;color:#059669;" align="left">${fmt(c.revenue)} ${m.sym}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #F3F4F6;color:#DC2626;" align="left">${fmt(c.expense)} ${m.sym}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #F3F4F6;color:${netColor};font-weight:bold;" align="left">${fmt(c.net)} ${m.sym}</td>
    </tr>`;
  }).join('');

  const financialBlock = (financial.byCurrency && financial.byCurrency.length)
    ? `<table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #E5E7EB;border-radius:10px;overflow:hidden;">
        <tr style="background:#FFF7ED;">
          <th align="right" style="padding:10px 12px;font-size:13px;color:#9A3412;">العملة</th>
          <th align="left" style="padding:10px 12px;font-size:13px;color:#9A3412;">الإيرادات</th>
          <th align="left" style="padding:10px 12px;font-size:13px;color:#9A3412;">المصروفات</th>
          <th align="left" style="padding:10px 12px;font-size:13px;color:#9A3412;">الصافي</th>
        </tr>
        ${financialRows}
      </table>`
    : `<div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;padding:16px;text-align:center;color:#6B7280;">لا توجد حركة مالية اليوم</div>`;

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:'Segoe UI',Tahoma,Arial,sans-serif;">
  <table width="100%" cellspacing="0" cellpadding="0" style="background:#F3F4F6;padding:24px 12px;">
    <tr><td align="center">
      <table width="640" cellspacing="0" cellpadding="0" style="max-width:640px;width:100%;background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 14px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr><td style="background:#F97316;background:linear-gradient(135deg,#F97316,#EA580C);padding:26px 24px;text-align:center;color:#FFFFFF;">
          <div style="font-size:24px;font-weight:bold;">📊 التقرير اليومي</div>
          <div style="opacity:.95;margin-top:6px;font-size:15px;">${companyName}</div>
          <div style="opacity:.85;margin-top:2px;font-size:13px;">${date}</div>
        </td></tr>

        <!-- Content -->
        <tr><td style="padding:24px;">

          <!-- المالي أولاً -->
          <div style="margin-bottom:26px;">
            ${sectionTitle('💰 الملخص المالي اليومي')}
            ${financialBlock}
            <div style="font-size:11px;color:#9CA3AF;margin-top:6px;">الصافي = الإيرادات (بعد المرتجعات) − المصروفات التشغيلية · المصروفات التأسيسية لا تُخصم</div>
          </div>

          <!-- الحضور -->
          <div style="margin-bottom:26px;">
            ${sectionTitle('👥 الحضور اليوم')}
            <table width="100%" cellspacing="0" cellpadding="0"><tr>
              ${statCell('الإجمالي', attendance.totalEmployees, '#111827')}
              ${statCell('✅ حاضر', attendance.present, '#059669')}
              ${statCell('⏰ متأخر', attendance.late, '#D97706')}
              ${statCell('❌ غائب', attendance.absent, '#DC2626')}
              ${statCell('🏝️ إجازة', attendance.onLeave, '#2563EB')}
            </tr></table>
          </div>

          <!-- المهام -->
          <div style="margin-bottom:${alerts.length ? '26px' : '4px'};">
            ${sectionTitle('📋 المهام')}
            <table width="100%" cellspacing="0" cellpadding="0"><tr>
              ${statCell('✅ مكتملة اليوم', tasks.completed, '#059669')}
              ${statCell('⏳ قيد التنفيذ', tasks.pending, '#D97706')}
              ${statCell('⚠️ متأخرة', tasks.overdue, '#DC2626')}
              <td width="40%"></td>
            </tr></table>
          </div>

          ${alerts.length > 0 ? `
          <!-- التنبيهات -->
          <div>
            ${sectionTitle('🔔 تنبيهات محتاجة انتباه')}
            <table width="100%" cellspacing="0" cellpadding="0" style="background:#FEF3C7;border-right:4px solid #F59E0B;border-radius:10px;">
              <tr><td style="padding:14px 16px;">
                ${alerts.map((a) => `<div style="color:#92400E;font-size:14px;margin:4px 0;">• ${a}</div>`).join('')}
              </td></tr>
            </table>
          </div>` : ''}

        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#F9FAFB;padding:18px 24px;text-align:center;color:#6B7280;font-size:12px;border-top:1px solid #E5E7EB;">
          تقرير تلقائي من نظام جيماوي · ${new Date().getFullYear()} ©
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
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
      replyTo: process.env.EMAIL_REPLY_TO || fromEmail,
      envelope: {
        from: fromEmail,
        to: email
      },
      to: email,
      subject: `📊 التقرير اليومي - ${reportData.date.toLocaleDateString('ar-EG')}`,
      html,
      attachments
    });

    // التحقق من رد Brevo الحقيقي: المستلم لازم يكون ضمن accepted وليس rejected
    const accepted = (info.accepted || []).map((a: any) => String(a).toLowerCase());
    const rejected = (info.rejected || []).map((a: any) => String(a).toLowerCase());
    if (rejected.length > 0 || !accepted.includes(email.toLowerCase())) {
      throw new Error(
        `خادم البريد (Brevo) لم يقبل التسليم إلى ${email} — accepted: [${accepted.join(', ')}], rejected: [${rejected.join(', ')}], response: ${info.response || 'بدون رد'}`
      );
    }
    console.log(`✅ Brevo قَبِل التسليم إلى ${email} | messageId: ${info.messageId} | response: ${info.response} | الصيغة: ${reportFormat}`);
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
