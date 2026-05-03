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

// دالة مساعدة للحصول على حدود اليوم بتوقيت مصر
const getEgyptDayBounds = () => {
  const egyptOffset = 2 * 60; // UTC+2 in minutes
  const now = new Date();
  const localNow = new Date(now.getTime() + egyptOffset * 60 * 1000);

  const today = new Date(localNow);
  today.setUTCHours(0, 0, 0, 0);
  const todayUTC = new Date(today.getTime() - egyptOffset * 60 * 1000);

  const tomorrowUTC = new Date(todayUTC);
  tomorrowUTC.setUTCDate(tomorrowUTC.getUTCDate() + 1);

  return { todayUTC, tomorrowUTC };
};

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

    // ✅ SECURITY FIX: Use server time ONLY to prevent time manipulation
    const serverTime = new Date();
    const checkInTime = serverTime;

    // ⚠️ Validate clientTime if provided (security check for suspicious activity)
    if (clientTime) {
      try {
        const clientDate = new Date(clientTime);
        const timeDiffMinutes = Math.abs(serverTime.getTime() - clientDate.getTime()) / (1000 * 60);

        // If client time differs by more than 10 minutes, log it as suspicious
        if (timeDiffMinutes > 10) {
          console.warn(`⚠️ SUSPICIOUS TIME MANIPULATION DETECTED:`);
          console.warn(`  User ID: ${userId}`);
          console.warn(`  Client Time: ${clientTime} (${clientDate.toISOString()})`);
          console.warn(`  Server Time: ${serverTime.toISOString()}`);
          console.warn(`  Difference: ${timeDiffMinutes.toFixed(1)} minutes`);
          console.warn(`  Client IP: ${clientIP}`);
        }
      } catch (e) {
        console.warn(`⚠️ Invalid clientTime format received from user ${userId}: ${clientTime}`);
      }
    }

    // استخدام توقيت مصر (UTC+2)
    const { todayUTC, tomorrowUTC } = getEgyptDayBounds();

    console.log(`🔍 checkIn: Looking for existing record for userId=${userId}, range=${todayUTC.toISOString()} to ${tomorrowUTC.toISOString()}`);

    const existing = await AttendanceRecord.findOne({
      userId,
      date: { $gte: todayUTC, $lt: tomorrowUTC },
    });

    console.log(`📋 checkIn: Found existing record: ${existing ? existing._id : 'null'}, checkIn: ${existing?.checkIn || 'none'}`);

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
      date: todayUTC,
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

    // ✅ PRIVACY FIX: Don't send exact time to user (only to managers)
    const sanitizedRecord = {
      _id: record._id,
      userId: record.userId,
      branchId: record.branchId,
      date: record.date,
      status: record.status,
      authMethod: record.authMethod,
      // Don't include checkIn time in response
    };

    res.json({
      success: true,
      message: `✅ تم تسجيل الحضور بنجاح ${methodMessage}`,
      data: sanitizedRecord,
      authMethod,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const checkOut = async (req: any, res: Response) => {
  try {
    const { latitude, longitude, clientTime, branchId, bypassLocation, accuracy } = req.body;
    const userId = req.user.userId;
    const clientIP = getClientIP(req);

    // ✅ SECURITY FIX: Use server time ONLY to prevent time manipulation
    const serverTime = new Date();
    const checkOutTime = serverTime;

    // ⚠️ Validate clientTime if provided (security check for suspicious activity)
    if (clientTime) {
      try {
        const clientDate = new Date(clientTime);
        const timeDiffMinutes = Math.abs(serverTime.getTime() - clientDate.getTime()) / (1000 * 60);

        // If client time differs by more than 10 minutes, log it as suspicious
        if (timeDiffMinutes > 10) {
          console.warn(`⚠️ SUSPICIOUS TIME MANIPULATION DETECTED (checkOut):`);
          console.warn(`  User ID: ${userId}`);
          console.warn(`  Client Time: ${clientTime} (${clientDate.toISOString()})`);
          console.warn(`  Server Time: ${serverTime.toISOString()}`);
          console.warn(`  Difference: ${timeDiffMinutes.toFixed(1)} minutes`);
          console.warn(`  Client IP: ${clientIP}`);
        }
      } catch (e) {
        console.warn(`⚠️ Invalid clientTime format received from user ${userId}: ${clientTime}`);
      }
    }

    // استخدام توقيت مصر (UTC+2)
    const { todayUTC, tomorrowUTC } = getEgyptDayBounds();

    console.log(`🔍 checkOut: Looking for record for userId=${userId}, range=${todayUTC.toISOString()} to ${tomorrowUTC.toISOString()}`);

    const record = await AttendanceRecord.findOne({
      userId,
      date: { $gte: todayUTC, $lt: tomorrowUTC },
    });

    console.log(`📋 checkOut: Found record: ${record ? record._id : 'null'}, checkIn: ${record?.checkIn || 'none'}, checkOut: ${record?.checkOut || 'none'}`);

    if (!record) {
      return res
        .status(404)
        .json({ success: false, message: "لم يتم تسجيل الحضور اليوم" });
    }
    if (!record.checkIn) {
      return res
        .status(400)
        .json({ success: false, message: "لم يتم تسجيل الحضور بعد" });
    }
    if (record.checkOut) {
      return res
        .status(400)
        .json({ success: false, message: "تم تسجيل الانصراف مسبقاً" });
    }

    record.checkOut = checkOutTime;
    record.checkOutLocation = {
      latitude: latitude || 0,
      longitude: longitude || 0
    };

    // حساب ساعات العمل
    if (record.checkIn) {
      const hours = (record.checkOut.getTime() - record.checkIn.getTime()) / (1000 * 60 * 60);
      record.workHours = Math.round(hours * 100) / 100; // تقريب لرقمين عشريين

      // حساب الوقت الإضافي (لو أكتر من 8 ساعات)
      if (hours > 8) {
        record.overtime = Math.round((hours - 8) * 100) / 100;
      }
    }

    await record.save();

    console.log(`✅ checkOut: Saved successfully. workHours=${record.workHours}, overtime=${record.overtime}`);

    // ✅ PRIVACY FIX: Don't send exact times to user (only to managers)
    const sanitizedRecord = {
      _id: record._id,
      userId: record.userId,
      branchId: record.branchId,
      date: record.date,
      status: record.status,
      workHours: record.workHours,
      // Don't include checkIn/checkOut times in response
    };

    res.json({
      success: true,
      message: "✅ تم تسجيل الانصراف بنجاح",
      data: sanitizedRecord,
    });
  } catch (error: any) {
    console.error('❌ checkOut error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTodayRecord = async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;

    // استخدام توقيت مصر (UTC+2) بدلاً من UTC
    // هذا يضمن أن "اليوم" يطابق التوقيت المحلي للمستخدم
    const now = new Date();
    const egyptOffset = 2 * 60; // +2 hours in minutes
    const localNow = new Date(now.getTime() + egyptOffset * 60 * 1000);

    // بداية اليوم بالتوقيت المحلي
    const today = new Date(localNow);
    today.setUTCHours(0, 0, 0, 0);
    // تحويل الوقت المحلي إلى UTC للبحث في قاعدة البيانات
    const todayUTC = new Date(today.getTime() - egyptOffset * 60 * 1000);

    const tomorrow = new Date(todayUTC);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    console.log(`🔍 getTodayRecord: userId=${userId}, range=${todayUTC.toISOString()} to ${tomorrow.toISOString()}`);

    const record = await AttendanceRecord.findOne({
      userId,
      date: { $gte: todayUTC, $lt: tomorrow },
    }).populate("branchId", "name");

    console.log(`📋 Found record: ${record ? record._id : 'null'}`);

    // ✅ PRIVACY FIX: Filter sensitive data based on user role
    const userRole = req.user?.role;
    const isManager = ['dev', 'general_manager', 'administrative_manager'].includes(userRole);

    if (!isManager && record) {
      // For regular employees, hide exact times but send flags
      const sanitizedRecord = {
        _id: record._id,
        userId: record.userId,
        branchId: record.branchId,
        date: record.date,
        status: record.status,
        workHours: record.workHours,
        overtime: record.overtime,
        // ✅ ADD boolean flags instead of actual times
        hasCheckedIn: !!record.checkIn,      // true/false
        hasCheckedOut: !!record.checkOut,    // true/false
      };
      res.json({ success: true, data: sanitizedRecord });
    } else {
      // For managers, send full record
      res.json({ success: true, data: record });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllTodayRecords = async (req: any, res: Response) => {
  try {
    // استخدام توقيت مصر (UTC+2)
    const now = new Date();
    const egyptOffset = 2 * 60;
    const localNow = new Date(now.getTime() + egyptOffset * 60 * 1000);

    const today = new Date(localNow);
    today.setUTCHours(0, 0, 0, 0);
    const todayUTC = new Date(today.getTime() - egyptOffset * 60 * 1000);

    const tomorrow = new Date(todayUTC);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    // ✅ FIXED: Managers see ALL records, regular employees see only their company's records
    const managerRoles = ['dev', 'administrative_manager', 'general_manager'];
    const query: any = { date: { $gte: todayUTC, $lt: tomorrow } };

    if (!managerRoles.includes(req.user?.role)) {
      query.companyId = req.user?.companyId;
    }

    const records = await AttendanceRecord.find(query)
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

    // تحويل الوقت المحلي (مصر UTC+2) إلى UTC
    // المستخدم يدخل 09:00 بتوقيت مصر، نخزنه كـ 07:00 UTC
    const egyptOffsetMs = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

    const data: any = {
      userId,
      date: existingDate,
      // تحويل الوقت المدخل (توقيت مصر) إلى UTC
      checkIn: checkIn ? new Date(new Date(`${date}T${checkIn}:00.000Z`).getTime() - egyptOffsetMs) : undefined,
      checkOut: checkOut ? new Date(new Date(`${date}T${checkOut}:00.000Z`).getTime() - egyptOffsetMs) : undefined,
      checkInLocation: { latitude: 0, longitude: 0 },
      status,
      delay: delay || 0,
      overtime: overtime || 0,
      isManualEntry: true,
      verifiedByManager: true,
      authMethod: 'manual', // الإدخال اليدوي له الأولوية القصوى
      modifiedBy: req.user.userId, // من قام بالإدخال
      // Permission fields (NEW)
      earlyLeaveMinutes: req.body.earlyLeaveMinutes || 0,
      earlyLeaveReason: req.body.earlyLeaveReason,
      lateArrivalReason: req.body.lateArrivalReason,
      permissionNotes: req.body.permissionNotes,
      permissionType: req.body.permissionType || 'none',
      permissionGrantedBy: req.user.userId, // المدير الذي منح الإذن
      permissionGrantedAt: new Date(), // تاريخ منح الإذن
      // Deduction fields (NEW) - for manager penalties
      deduction: req.body.deduction ? {
        type: req.body.deduction.type,
        amount: req.body.deduction.amount,
        reason: req.body.deduction.reason,
        appliedBy: req.user.userId,
        appliedAt: new Date()
      } : undefined
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

    // ✅ FIX: استخدام توقيت مصر (UTC+2) لحساب نطاق التاريخ
    // السجلات تُخزن بتوقيت مصر، لذا يجب أن يتطابق نطاق البحث
    const egyptOffset = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

    // بداية الشهر بتوقيت مصر (00:00 مصر = 22:00 اليوم السابق UTC)
    const startDateEgypt = new Date(
      parseInt(year as string),
      parseInt(month as string) - 1,
      1
    );
    const startDate = new Date(startDateEgypt.getTime() - egyptOffset);

    // نهاية الشهر بتوقيت مصر (23:59:59 مصر)
    const endDateEgypt = new Date(
      parseInt(year as string),
      parseInt(month as string),
      0,
      23, 59, 59, 999
    );
    const endDate = new Date(endDateEgypt.getTime() - egyptOffset);

    console.log(`📅 getMonthlyReport: البحث من ${startDate.toISOString()} إلى ${endDate.toISOString()}`);

    const query: any = { date: { $gte: startDate, $lte: endDate } };

    // إضافة فلترة حسب الدور
    const userRole = req.user?.role;
    const isManager = ['dev', 'general_manager', 'administrative_manager'].includes(userRole);

    // إذا تم تحديد userId في الطلب، استخدمه (للمديرين الذين يريدون فلترة موظف معين)
    if (userId) {
      query.userId = userId;
    }
    // إذا كان موظف عادي، فرض الفلترة على سجلاته فقط
    else if (!isManager) {
      query.userId = req.user.userId;
      console.log(`🔒 موظف عادي ${req.user.userId} - عرض سجلاته فقط`);
    }
    // إذا كان مدير ولم يحدد موظف، عرض جميع السجلات
    else {
      console.log(`👔 مدير ${req.user.userId} - عرض جميع السجلات للشهر ${month}/${year}`);
    }

    const records = await AttendanceRecord.find(query)
      .populate("userId", "name")
      .populate("modifiedBy", "name") // من قام بالتعديل اليدوي
      .populate("permissionGrantedBy", "name") // من منح الإذن
      .populate("deduction.appliedBy", "name") // NEW: من أضاف الخصم
      .sort({ date: 1 });

    console.log(`📊 تم إيجاد ${records.length} سجل`);

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
    console.error('❌ getMonthlyReport error:', error);
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

    // تحويل الوقت المحلي (مصر UTC+2) إلى UTC
    const egyptOffsetMs = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
    const recordDate = date || record.date.toISOString().split("T")[0];

    if (checkIn) {
      const localTime = new Date(`${recordDate}T${checkIn}:00.000Z`);
      record.checkIn = new Date(localTime.getTime() - egyptOffsetMs);
    }
    if (checkOut) {
      const localTime = new Date(`${recordDate}T${checkOut}:00.000Z`);
      record.checkOut = new Date(localTime.getTime() - egyptOffsetMs);
    }
    if (status) record.status = status;
    if (leaveType !== undefined) record.leaveType = leaveType || undefined;
    if (delay !== undefined) record.delay = delay;
    if (overtime !== undefined) record.overtime = overtime;

    // Permission fields (NEW)
    if (req.body.earlyLeaveMinutes !== undefined) record.earlyLeaveMinutes = req.body.earlyLeaveMinutes;
    if (req.body.earlyLeaveReason !== undefined) record.earlyLeaveReason = req.body.earlyLeaveReason;
    if (req.body.lateArrivalReason !== undefined) record.lateArrivalReason = req.body.lateArrivalReason;
    if (req.body.permissionNotes !== undefined) record.permissionNotes = req.body.permissionNotes;
    if (req.body.permissionType !== undefined) record.permissionType = req.body.permissionType;

    // Deduction fields (NEW) - for manager penalties
    if (req.body.deduction !== undefined) {
      if (req.body.deduction === null || !req.body.deduction.amount) {
        record.deduction = undefined; // Remove deduction
      } else {
        record.deduction = {
          type: req.body.deduction.type,
          amount: req.body.deduction.amount,
          reason: req.body.deduction.reason,
          appliedBy: req.user.userId,
          appliedAt: new Date()
        };
      }
    }

    record.isManualEntry = true;
    record.verifiedByManager = true;
    record.authMethod = 'manual'; // التعديل اليدوي له الأولوية القصوى
    record.modifiedBy = req.user.userId; // من قام بالتعديل
    record.permissionGrantedBy = req.user.userId; // NEW: المدير الذي منح الإذن
    record.permissionGrantedAt = new Date(); // NEW: تاريخ منح الإذن

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
