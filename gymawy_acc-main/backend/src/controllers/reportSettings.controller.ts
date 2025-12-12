import { Request, Response } from "express";
import ReportSettings from "../models/ReportSettings";
import User from "../models/User";
import { generateDailyReport } from "../services/dailyReport.service";
import {
  sendDailyReport,
  ReportFormat,
  resetTransporter,
} from "../services/email.service";
import Company from "../models/Company";
import {
  rescheduleReports,
  sendImmediateReport,
} from "../jobs/dailyReport.job";

export const getSettings = async (req: Request, res: Response) => {
  try {
    let settings = await ReportSettings.findOne().populate(
      "recipients.userId",
      "name email"
    );

    if (!settings) {
      const managers = await User.find({
        role: { $in: ["general_manager", "administrative_manager"] },
      });

      settings = await ReportSettings.create({
        enabled: true,
        sendTime: "18:00",
        recipients: managers.map((m) => ({
          userId: m._id,
          email: m.email,
          name: m.name,
          enabled: true,
        })),
        reportSections: {
          attendance: true,
          financial: true,
          tasks: true,
          alerts: true,
        },
        frequency: "daily",
      });
    }

    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    const settings = await ReportSettings.findOneAndUpdate({}, req.body, {
      new: true,
      upsert: true,
    });

    res.json({ message: "تم تحديث الإعدادات بنجاح", settings });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const toggleEnabled = async (req: Request, res: Response) => {
  try {
    const { enabled } = req.body;

    const settings = await ReportSettings.findOneAndUpdate(
      {},
      { enabled },
      { new: true, upsert: true }
    );

    res.json({
      message: enabled
        ? "تم تفعيل التقارير اليومية"
        : "تم إيقاف التقارير اليومية",
      settings,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateRecipients = async (req: Request, res: Response) => {
  try {
    const { recipients } = req.body;

    const cleanedRecipients = recipients.map((r: any) => ({
      userId: r.userId?.id || r.userId,
      email: r.email,
      name: r.name,
      enabled: r.enabled,
    }));

    const settings = await ReportSettings.findOneAndUpdate(
      {},
      { recipients: cleanedRecipients },
      { new: true, upsert: true }
    );

    res.json({ message: "تم تحديث المستلمين بنجاح", settings });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateSendTime = async (req: Request, res: Response) => {
  try {
    const { sendTime } = req.body;

    const settings = await ReportSettings.findOneAndUpdate(
      {},
      { sendTime },
      { new: true, upsert: true }
    );

    // إعادة جدولة التقارير مع الوقت الجديد
    await rescheduleReports();

    res.json({ message: "تم تحديث موعد الإرسال بنجاح", settings });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateReportSections = async (req: Request, res: Response) => {
  try {
    const { reportSections } = req.body;

    const settings = await ReportSettings.findOneAndUpdate(
      {},
      { reportSections },
      { new: true, upsert: true }
    );

    res.json({ message: "تم تحديث أقسام التقرير بنجاح", settings });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const sendTestReport = async (req: Request, res: Response) => {
  try {
    // استخدام بيانات المستخدم من الـ middleware مباشرة
    const user = (req as any).user;

    if (!user || !user.email) {
      return res
        .status(404)
        .json({ message: "المستخدم غير موجود أو لا يملك إيميل" });
    }

    // البحث عن الشركة أو إنشاء واحدة افتراضية
    let company = await Company.findOne();
    if (!company) {
      company = await Company.create({
        name: "شركة جماوي",
        industry: "محاسبة",
        isActive: true,
      });
    }

    // جلب صيغة التقرير من الإعدادات
    const settings = await ReportSettings.findOne();
    const reportFormat = (settings?.reportFormat || "both") as ReportFormat;
    const senderEmail = settings?.senderEmail || process.env.EMAIL_FROM;

    const reportData = await generateDailyReport(
      (company as any)._id.toString()
    );
    await sendDailyReport(
      user.email,
      user.name,
      reportData,
      company.name,
      settings?.senderName,
      reportFormat,
      senderEmail
    );

    res.json({ message: "تم إرسال تقرير تجريبي إلى بريدك الإلكتروني" });
  } catch (error: any) {
    console.error("❌ خطأ في إرسال التقرير التجريبي:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getReportHistory = async (req: Request, res: Response) => {
  try {
    const settings = await ReportSettings.findOne();

    res.json({
      lastSentAt: settings?.lastSentAt,
      enabled: settings?.enabled,
      nextScheduledTime: settings?.sendTime,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const sendNowReport = async (req: Request, res: Response) => {
  try {
    await sendImmediateReport();
    res.json({ message: "تم إرسال التقارير لجميع المستلمين المفعلين" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// إرسال تقرير تجريبي لمستلم محدد
export const testRecipientEmail = async (req: Request, res: Response) => {
  try {
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({ message: "الإيميل مطلوب" });
    }

    // البحث عن الشركة أو إنشاء واحدة افتراضية
    let company = await Company.findOne();
    if (!company) {
      company = await Company.create({
        name: "شركة جماوي",
        industry: "محاسبة",
        isActive: true,
      });
    }

    // جلب صيغة التقرير من الإعدادات
    const settings = await ReportSettings.findOne();
    const reportFormat = (settings?.reportFormat || "both") as ReportFormat;
    const senderEmail = settings?.senderEmail || process.env.EMAIL_FROM;

    const reportData = await generateDailyReport(
      (company as any)._id.toString()
    );
    await sendDailyReport(
      email,
      name || "مستلم",
      reportData,
      company.name,
      settings?.senderName,
      reportFormat,
      senderEmail
    );

    // تسجيل عملية الإرسال
    const ReportLog = (await import("../models/ReportLog")).default;
    await ReportLog.create({
      recipientEmail: email,
      recipientName: name || "مستلم",
      status: "success",
      sentAt: new Date(),
      reportType: "test",
    });

    res.json({ message: `تم إرسال تقرير تجريبي إلى ${email}` });
  } catch (error: any) {
    // تسجيل الفشل
    try {
      const ReportLog = (await import("../models/ReportLog")).default;
      await ReportLog.create({
        recipientEmail: req.body.email,
        recipientName: req.body.name || "مستلم",
        status: "failed",
        errorMessage: error.message,
        sentAt: new Date(),
        reportType: "test",
      });
    } catch (logError) {
      console.error("Failed to log report error:", logError);
    }
    res.status(500).json({ message: error.message });
  }
};

// جلب سجل الإرسال
export const getReportLogs = async (req: Request, res: Response) => {
  try {
    const ReportLog = (await import("../models/ReportLog")).default;
    const logs = await ReportLog.find().sort({ sentAt: -1 }).limit(20);

    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// تحديث معلومات المرسل (الاسم والإيميل)
export const updateSenderInfo = async (req: Request, res: Response) => {
  try {
    const { senderName, senderEmail } = req.body;

    const updateData: any = {};
    if (senderName !== undefined) updateData.senderName = senderName;
    if (senderEmail !== undefined) {
      updateData.senderEmail = senderEmail;
      // إعادة تعيين transporter عند تغيير بريد المرسل
      resetTransporter();
    }

    const settings = await ReportSettings.findOneAndUpdate({}, updateData, {
      new: true,
      upsert: true,
    });

    res.json({ message: "تم تحديث معلومات المرسل بنجاح", settings });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// تحديث صيغة التقرير (PDF / HTML / Both)
export const updateReportFormat = async (req: Request, res: Response) => {
  try {
    const { reportFormat } = req.body;

    if (!["pdf", "html", "both"].includes(reportFormat)) {
      return res
        .status(400)
        .json({ message: "صيغة غير صالحة. الخيارات المتاحة: pdf, html, both" });
    }

    const settings = await ReportSettings.findOneAndUpdate(
      {},
      { reportFormat },
      { new: true, upsert: true }
    );

    const formatLabels: Record<string, string> = {
      pdf: "PDF فقط",
      html: "HTML فقط",
      both: "PDF + HTML",
    };

    res.json({
      message: `تم تحديث صيغة التقرير إلى: ${formatLabels[reportFormat]}`,
      settings,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
