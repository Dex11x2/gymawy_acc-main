import { Request, Response } from 'express';
import AttendanceSystem from '../models/AttendanceSystem';
import Employee from '../models/Employee';

export const getDailyAttendance = async (req: any, res: Response) => {
  try {
    const { date } = req.query;
    const companyId = req.user?.companyId;
    
    const records = await AttendanceSystem.find({
      date: new Date(date as string),
      companyId
    }).populate('employeeId', 'name position');
    
    res.json({ success: true, data: records });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMonthlyReport = async (req: any, res: Response) => {
  try {
    const { month, year } = req.query;
    const companyId = req.user?.companyId;
    
    const startDate = new Date(parseInt(year as string), parseInt(month as string) - 1, 1);
    const endDate = new Date(parseInt(year as string), parseInt(month as string), 0);
    
    const employees = await Employee.find({ companyId });
    const reports = [];
    
    for (const employee of employees) {
      const records = await AttendanceSystem.find({
        employeeId: employee._id,
        date: { $gte: startDate, $lte: endDate }
      });
      
      const report = {
        employeeId: employee._id,
        employeeName: employee.name,
        month: parseInt(month as string),
        year: parseInt(year as string),
        presentDays: records.filter(r => r.status === 'present' || r.status === 'late').length,
        absentDays: records.filter(r => r.status === 'absent').length,
        annualLeaveDays: records.filter(r => r.status === 'leave' && r.leaveType === 'annual').length,
        emergencyLeaveDays: records.filter(r => r.status === 'leave' && r.leaveType === 'emergency').length,
        sickLeaveDays: records.filter(r => r.status === 'leave' && r.leaveType === 'sick').length,
        officialHolidayDays: records.filter(r => r.status === 'official_holiday').length,
        lateDays: records.filter(r => r.status === 'late').length,
        totalLateMinutes: records.reduce((sum, r) => sum + (r.lateMinutes || 0), 0),
        totalWorkHours: records.reduce((sum, r) => sum + (r.workHours || 0), 0),
        totalOvertime: records.reduce((sum, r) => sum + (r.overtime || 0), 0),
        remainingAnnualLeave: employee.leaveBalance?.annual || 21,
        remainingEmergencyLeave: employee.leaveBalance?.emergency || 7
      };
      
      reports.push(report);
    }
    
    res.json({ success: true, data: reports });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createAttendance = async (req: any, res: Response) => {
  try {
    const { employeeId, date, status, checkIn, checkOut, lateMinutes, overtime, delay, leaveType, notes, confirmed, branchId } = req.body;
    
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'الموظف غير موجود' });
    }
    
    // حساب ساعات العمل
    let workHours = 0;
    if (checkIn && checkOut) {
      const checkInDate = new Date(`${date}T${checkIn}`);
      const checkOutDate = new Date(`${date}T${checkOut}`);
      workHours = (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60);
    }
    
    const record = await AttendanceSystem.create({
      employeeId,
      employeeName: employee.name,
      companyId: req.user?.companyId,
      branchId: branchId || undefined,
      date: new Date(date),
      checkIn: checkIn ? new Date(`${date}T${checkIn}`) : undefined,
      checkOut: checkOut ? new Date(`${date}T${checkOut}`) : undefined,
      workHours,
      overtime: overtime || 0,
      delay: delay || 0,
      status,
      leaveType,
      lateMinutes: lateMinutes || 0,
      notes,
      confirmed: confirmed || false,
      isManualEntry: true
    });
    
    res.status(201).json({ success: true, message: 'تم إنشاء السجل بنجاح', data: record });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateAttendance = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // إعادة حساب ساعات العمل إذا تم تحديث الأوقات
    if (updates.checkIn || updates.checkOut) {
      const record = await AttendanceSystem.findById(id);
      if (record) {
        const checkIn = updates.checkIn ? new Date(`${updates.date || record.date}T${updates.checkIn}`) : record.checkIn;
        const checkOut = updates.checkOut ? new Date(`${updates.date || record.date}T${updates.checkOut}`) : record.checkOut;
        
        if (checkIn && checkOut) {
          updates.workHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
        }
      }
    }
    
    const record = await AttendanceSystem.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true }
    );
    
    if (!record) {
      return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    }
    
    res.json({ success: true, message: 'تم تحديث السجل بنجاح', data: record });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const confirmDay = async (req: any, res: Response) => {
  try {
    const { date } = req.body;
    const companyId = req.user?.companyId;
    
    const result = await AttendanceSystem.updateMany(
      { 
        date: new Date(date), 
        companyId,
        confirmed: false 
      },
      { confirmed: true }
    );
    
    res.json({ 
      success: true, 
      message: 'تم تأكيد اليوم بنجاح', 
      confirmedCount: result.modifiedCount 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// حساب المسافة بين نقطتين GPS (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

export const checkInWithLocation = async (req: any, res: Response) => {
  try {
    const { employeeId, latitude, longitude, branchId } = req.body;
    const companyId = req.user?.companyId;
    
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'الموظف غير موجود' });
    }
    
    // التحقق من عدم وجود تسجيل حضور اليوم
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existingRecord = await AttendanceSystem.findOne({
      employeeId,
      date: { $gte: today }
    });
    
    if (existingRecord && existingRecord.checkIn) {
      return res.status(400).json({ 
        success: false, 
        message: 'تم تسجيل الحضور مسبقاً اليوم' 
      });
    }
    
    // الأولوية: فرع محدد → موقع الموظف → موقع الشركة
    let targetLocation: any = null;
    let allowedRadius = 100;
    let locationType = '';
    let selectedBranchId = null;
    
    if (branchId) {
      const Branch = (await import('../models/Branch')).default;
      const branch = await Branch.findById(branchId);
      if (branch) {
        targetLocation = { latitude: branch.latitude, longitude: branch.longitude };
        allowedRadius = branch.radius;
        locationType = `فرع ${branch.name}`;
        selectedBranchId = branch._id;
      }
    }
    
    if (!targetLocation && employee.workLocation && employee.workLocation.latitude) {
      targetLocation = employee.workLocation;
      allowedRadius = employee.workLocation.radius || 100;
      locationType = 'موقع الموظف';
    }
    
    if (!targetLocation) {
      const Company = (await import('../models/Company')).default;
      const company = await Company.findById(companyId);
      
      if (!company || !company.location || !company.location.latitude) {
        return res.status(400).json({ 
          success: false, 
          message: 'لم يتم تحديد موقع العمل' 
        });
      }
      
      targetLocation = company.location;
      allowedRadius = company.location.radius || 100;
      locationType = 'موقع الشركة';
    }
    
    // حساب المسافة
    const distance = calculateDistance(
      latitude,
      longitude,
      targetLocation.latitude,
      targetLocation.longitude
    );
    
    if (distance > allowedRadius) {
      return res.status(403).json({ 
        success: false, 
        message: `أنت خارج نطاق ${locationType}. المسافة: ${Math.round(distance)} متر (الحد المسموح: ${allowedRadius} متر)`,
        distance: Math.round(distance),
        allowedRadius,
        locationType
      });
    }
    
    // تسجيل الحضور
    const now = new Date();
    const record = await AttendanceSystem.create({
      employeeId,
      employeeName: employee.name,
      companyId,
      branchId: selectedBranchId,
      date: today,
      checkIn: now,
      status: 'present',
      lateMinutes: 0,
      confirmed: false,
      isManualEntry: false,
      checkInLocation: {
        latitude,
        longitude,
        distance: Math.round(distance)
      }
    });
    
    res.json({ 
      success: true, 
      message: `✅ تم تسجيل الحضور بنجاح (من ${locationType})`,
      data: record,
      distance: Math.round(distance),
      locationType
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const checkOutWithLocation = async (req: any, res: Response) => {
  try {
    const { employeeId, latitude, longitude } = req.body;
    const companyId = req.user?.companyId;
    
    // البحث عن سجل الحضور اليوم
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const record = await AttendanceSystem.findOne({
      employeeId,
      date: { $gte: today },
      checkIn: { $exists: true }
    });
    
    if (!record) {
      return res.status(404).json({ 
        success: false, 
        message: 'لم يتم تسجيل الحضور اليوم' 
      });
    }
    
    if (record.checkOut) {
      return res.status(400).json({ 
        success: false, 
        message: 'تم تسجيل الانصراف مسبقاً' 
      });
    }
    
    const employee = await Employee.findById(employeeId);
    
    // الأولوية: موقع الموظف المحدد يدوياً
    let targetLocation = null;
    let allowedRadius = 100;
    let locationType = '';
    
    if (employee?.workLocation && employee.workLocation.latitude) {
      targetLocation = employee.workLocation;
      allowedRadius = employee.workLocation.radius || 100;
      locationType = 'موقع الموظف';
    } else {
      const Company = (await import('../models/Company')).default;
      const company = await Company.findById(companyId);
      
      if (!company || !company.location || !company.location.latitude) {
        return res.status(400).json({ 
          success: false, 
          message: 'لم يتم تحديد موقع العمل للموظف أو الشركة' 
        });
      }
      
      targetLocation = company.location;
      allowedRadius = company.location.radius || 100;
      locationType = 'موقع الشركة';
    }
    
    // حساب المسافة
    const distance = calculateDistance(
      latitude,
      longitude,
      targetLocation.latitude,
      targetLocation.longitude
    );
    
    if (distance > allowedRadius) {
      return res.status(403).json({ 
        success: false, 
        message: `أنت خارج نطاق ${locationType}. المسافة: ${Math.round(distance)} متر (الحد المسموح: ${allowedRadius} متر)`,
        distance: Math.round(distance),
        allowedRadius,
        locationType
      });
    }
    
    // تسجيل الانصراف
    const now = new Date();
    record.checkOut = now;
    record.checkOutLocation = {
      latitude,
      longitude,
      distance: Math.round(distance)
    };
    
    // حساب ساعات العمل
    if (record.checkIn) {
      record.workHours = (now.getTime() - record.checkIn.getTime()) / (1000 * 60 * 60);
    }
    
    await record.save();
    
    res.json({ 
      success: true, 
      message: `✅ تم تسجيل الانصراف بنجاح (من ${locationType})`,
      data: record,
      distance: Math.round(distance),
      locationType
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTodayAttendance = async (req: any, res: Response) => {
  try {
    const { employeeId } = req.params;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const record = await AttendanceSystem.findOne({
      employeeId,
      date: { $gte: today }
    });
    
    res.json({ success: true, data: record });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
