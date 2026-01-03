import { Response } from "express";
import AttendanceRecord from "../models/AttendanceRecord";
import Branch from "../models/Branch";
import User from "../models/User";

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// الحصول على IP المستخدم الحالي
const getClientIP = (req: any): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         req.ip ||
         'unknown';
};

export const checkIn = async (req: any, res: Response) => {
  try {
    const { latitude, longitude, branchId, clientTime, bypassLocation, accuracy, useIPAuth, selfiePhoto, selfieTimestamp, selfieDeviceInfo } = req.body;
    const userId = req.user.userId;
    const clientIP = getClientIP(req);

    // استخدام الوقت المرسل من العميل أو وقت السيرفر
    const checkInTime = clientTime ? new Date(clientTime) : new Date();

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const existing = await AttendanceRecord.findOne({
      userId,
      date: { $gte: today },
    });
    if (existing?.checkIn) {
      return res
        .status(400)
        .json({ success: false, message: "تم تسجيل الحضور مسبقاً" });
    }

    let targetLocation: any = null;
    let allowedRadius = 150;
    let skipLocationCheck = bypassLocation === true;
    let matchedBranch: any = null;
    let authMethod = 'location'; // location | ip | bypass

    // التحقق من IP أولاً إذا طلب المستخدم
    if (useIPAuth && branchId) {
      const branch = await Branch.findById(branchId);
      if (branch && branch.allowedIPs && branch.allowedIPs.includes(clientIP)) {
        // IP مطابق - تسجيل مباشر بدون فحص الموقع
        skipLocationCheck = true;
        matchedBranch = branch;
        authMethod = 'ip';
      }
    }

    // لو مفيش تسجيل بـ IP، نتحقق من الموقع
    if (!matchedBranch) {
      if (!latitude || !longitude) {
        return res.status(400).json({ success: false, message: 'يرجى تحديد الموقع الجغرافي' });
      }

      if (branchId) {
        const branch = await Branch.findById(branchId);
        if (!branch)
          return res
            .status(404)
            .json({ success: false, message: "الفرع غير موجود" });

        // التحقق من IP حتى لو لم يطلب المستخدم صراحة
        if (branch.allowedIPs && branch.allowedIPs.includes(clientIP)) {
          skipLocationCheck = true;
          authMethod = 'ip';
        }

        targetLocation = {
          latitude: branch.latitude,
          longitude: branch.longitude,
        };
        allowedRadius = branch.radius;
        matchedBranch = branch;
      } else {
        const user = await User.findById(userId);
        if (user?.companyId) {
          const Company = (await import("../models/Company")).default;
          const company = await Company.findById(user.companyId);
          if (company?.location) {
            targetLocation = company.location;
            allowedRadius = company.location.radius || 100;
          }
        }
        if (!targetLocation) {
          skipLocationCheck = true;
        }
      }
    }

    // فحص المسافة إذا لم يتم تجاوز فحص الموقع
    if (!skipLocationCheck && targetLocation) {
      const distance = calculateDistance(
        latitude,
        longitude,
        targetLocation.latitude,
        targetLocation.longitude
      );

      if (distance > allowedRadius) {
        return res.status(403).json({
          success: false,
          message: `أنت خارج النطاق المسموح. المسافة: ${Math.round(
            distance
          )} متر`,
          distance: Math.round(distance),
          allowedRadius,
          clientIP, // إرسال IP للمستخدم ليعرفه
        });
      }
    }

    if (bypassLocation) {
      authMethod = 'bypass';
      // التحقق من وجود صورة السيلفي عند استخدام التجاوز اليدوي
      if (!selfiePhoto) {
        return res.status(400).json({
          success: false,
          message: 'يجب التقاط صورة سيلفي للتحقق من الهوية عند التجاوز اليدوي',
          requiresSelfie: true
        });
      }
      // التحقق من أن وقت الصورة قريب من الوقت الحالي (خلال 5 دقائق)
      if (selfieTimestamp) {
        const photoTime = new Date(selfieTimestamp).getTime();
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        if (Math.abs(now - photoTime) > fiveMinutes) {
          return res.status(400).json({
            success: false,
            message: 'الصورة قديمة. يرجى التقاط صورة جديدة',
            requiresSelfie: true
          });
        }
      }
    }

    const record = await AttendanceRecord.create({
      userId,
      branchId: branchId || matchedBranch?._id || undefined,
      date: today,
      checkIn: checkInTime,
      checkInLocation: latitude && longitude ? { latitude, longitude } : { latitude: 0, longitude: 0 },
      status: "present",
      isManualEntry: false,
      authMethod, // حفظ طريقة التسجيل
      clientIP, // حفظ IP المستخدم
      // حفظ بيانات السيلفي إذا كان التجاوز اليدوي
      selfiePhoto: authMethod === 'bypass' ? selfiePhoto : undefined,
      selfieTimestamp: authMethod === 'bypass' && selfieTimestamp ? new Date(selfieTimestamp) : undefined,
      selfieDeviceInfo: authMethod === 'bypass' ? selfieDeviceInfo : undefined,
    });

    const methodMessage = authMethod === 'ip' ? '(عبر شبكة المكتب)' :
                          authMethod === 'bypass' ? '(تجاوز فحص الموقع)' : '';

    res.json({
      success: true,
      message: `✅ تم تسجيل الحضور بنجاح ${methodMessage}`,
      data: record,
      authMethod,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const checkOut = async (req: any, res: Response) => {
  try {
    const { latitude, longitude, clientTime } = req.body;
    const userId = req.user.userId;

    // استخدام الوقت المرسل من العميل أو وقت السيرفر
    const checkOutTime = clientTime ? new Date(clientTime) : new Date();

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const record = await AttendanceRecord.findOne({
      userId,
      date: { $gte: today },
    });
    if (!record) {
      return res
        .status(404)
        .json({ success: false, message: "لم يتم تسجيل الحضور اليوم" });
    }
    if (record.checkOut) {
      return res
        .status(400)
        .json({ success: false, message: "تم تسجيل الانصراف مسبقاً" });
    }

    record.checkOut = checkOutTime;
    record.checkOutLocation = { latitude, longitude };

    if (record.checkIn) {
      const hours =
        (record.checkOut.getTime() - record.checkIn.getTime()) /
        (1000 * 60 * 60);
      if (hours > 8) record.overtime = hours - 8;
    }

    await record.save();

    res.json({
      success: true,
      message: "✅ تم تسجيل الانصراف بنجاح",
      data: record,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTodayRecord = async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    const record = await AttendanceRecord.findOne({
      userId,
      date: { $gte: today, $lt: tomorrow },
    }).populate("branchId", "name");

    res.json({ success: true, data: record });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllTodayRecords = async (req: any, res: Response) => {
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    const records = await AttendanceRecord.find({ date: { $gte: today, $lt: tomorrow } })
      .populate("userId", "name email")
      .populate("branchId", "name");

    res.json({ success: true, data: records });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const manualEntry = async (req: any, res: Response) => {
  try {
    const {
      userId,
      date,
      checkIn,
      checkOut,
      status,
      leaveType,
      delay,
      overtime,
    } = req.body;

    const existingDate = new Date(date);
    existingDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(existingDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const existing = await AttendanceRecord.findOne({
      userId,
      date: { $gte: existingDate, $lt: nextDay },
    });

    if (existing) {
      return res
        .status(400)
        .json({
          success: false,
          message: "يوجد سجل لهذا اليوم بالفعل. استخدم التعديل بدلاً من ذلك",
        });
    }

    const data: any = {
      userId,
      date: existingDate,
      // تخزين الوقت كـ UTC - نفس القيمة المدخلة بالضبط
      checkIn: checkIn ? new Date(`${date}T${checkIn}:00.000Z`) : undefined,
      checkOut: checkOut ? new Date(`${date}T${checkOut}:00.000Z`) : undefined,
      checkInLocation: { latitude: 0, longitude: 0 },
      status,
      delay: delay || 0,
      overtime: overtime || 0,
      isManualEntry: true,
      verifiedByManager: true,
    };

    if (leaveType && leaveType !== "") {
      data.leaveType = leaveType;
    }

    const record = await AttendanceRecord.create(data);

    res
      .status(201)
      .json({ success: true, message: "تم الإضافة بنجاح", data: record });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMonthlyReport = async (req: any, res: Response) => {
  try {
    const { month, year, userId } = req.query;

    const startDate = new Date(
      parseInt(year as string),
      parseInt(month as string) - 1,
      1
    );
    const endDate = new Date(
      parseInt(year as string),
      parseInt(month as string),
      0
    );

    const query: any = { date: { $gte: startDate, $lte: endDate } };
    if (userId) query.userId = userId;

    const records = await AttendanceRecord.find(query)
      .populate("userId", "name")
      .sort({ date: 1 });

    const summary = {
      totalPresent: records.filter(
        (r) => r.status === "present" || r.status === "late"
      ).length,
      totalAbsent: records.filter((r) => r.status === "absent").length,
      totalLeave: records.filter((r) => r.status === "leave").length,
      totalDelay: records.reduce((sum, r) => sum + r.delay, 0),
      totalOvertime: records.reduce((sum, r) => sum + r.overtime, 0),
    };

    res.json({ success: true, data: { records, summary } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateRecord = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate id
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({ success: false, message: 'معرف السجل غير صحيح' });
    }
    
    const { date, checkIn, checkOut, status, leaveType, delay, overtime } =
      req.body;

    const record = await AttendanceRecord.findById(id);
    if (!record) {
      return res
        .status(404)
        .json({ success: false, message: "السجل غير موجود" });
    }

    if (date) record.date = new Date(date);
    // تخزين الوقت كـ UTC - نفس القيمة المدخلة بالضبط
    if (checkIn)
      record.checkIn = new Date(
        `${date || record.date.toISOString().split("T")[0]}T${checkIn}:00.000Z`
      );
    if (checkOut)
      record.checkOut = new Date(
        `${date || record.date.toISOString().split("T")[0]}T${checkOut}:00.000Z`
      );
    if (status) record.status = status;
    if (leaveType !== undefined) record.leaveType = leaveType || undefined;
    if (delay !== undefined) record.delay = delay;
    if (overtime !== undefined) record.overtime = overtime;
    record.isManualEntry = true;
    record.verifiedByManager = true;

    await record.save();

    res.json({ success: true, message: "تم التحديث بنجاح", data: record });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteRecord = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate id
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({ success: false, message: 'معرف السجل غير صحيح' });
    }

    const record = await AttendanceRecord.findByIdAndDelete(id);
    if (!record) {
      return res
        .status(404)
        .json({ success: false, message: "السجل غير موجود" });
    }

    res.json({ success: true, message: "تم الحذف بنجاح" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// إحصائيات صور السيلفي
export const getSelfieStats = async (req: any, res: Response) => {
  try {
    const { getSelfieStats: getStats } = await import('../jobs/selfieCleanup.job');
    const stats = await getStats();

    if (!stats) {
      return res.status(500).json({ success: false, message: 'فشل جلب الإحصائيات' });
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// تنظيف صور السيلفي القديمة يدوياً
export const cleanupSelfiePhotos = async (req: any, res: Response) => {
  try {
    const { cleanupOldSelfiePhotos } = await import('../jobs/selfieCleanup.job');
    const result = await cleanupOldSelfiePhotos();

    if (!result.success) {
      return res.status(500).json({ success: false, message: result.error || 'فشل التنظيف' });
    }

    res.json({
      success: true,
      message: `تم تنظيف ${result.cleanedRecords} سجل`,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
