import { Request, Response } from 'express';
import DailyAttendance from '../models/DailyAttendance';
import Employee from '../models/Employee';

// Check in
export const checkIn = async (req: any, res: Response) => {
  try {
    const { employeeId } = req.body;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existing = await DailyAttendance.findOne({
      employeeId,
      date: today
    });
    
    if (existing && existing.checkIn) {
      return res.status(400).json({ message: 'تم تسجيل الحضور بالفعل اليوم' });
    }
    
    const checkInTime = new Date();
    const workStartTime = new Date();
    workStartTime.setHours(9, 0, 0, 0); // 9 AM
    
    const lateMinutes = checkInTime > workStartTime 
      ? Math.floor((checkInTime.getTime() - workStartTime.getTime()) / 60000)
      : 0;
    
    const status = lateMinutes > 15 ? 'late' : 'present';
    
    if (existing) {
      existing.checkIn = checkInTime;
      existing.status = status;
      existing.lateMinutes = lateMinutes;
      await existing.save();
      return res.json(existing);
    }
    
    const attendance = await DailyAttendance.create({
      employeeId,
      date: today,
      checkIn: checkInTime,
      status,
      lateMinutes
    });
    
    res.status(201).json(attendance);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Check out
export const checkOut = async (req: any, res: Response) => {
  try {
    const { employeeId } = req.body;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const attendance = await DailyAttendance.findOne({
      employeeId,
      date: today
    });
    
    if (!attendance) {
      return res.status(404).json({ message: 'لم يتم تسجيل الحضور اليوم' });
    }
    
    if (attendance.checkOut) {
      return res.status(400).json({ message: 'تم تسجيل الانصراف بالفعل' });
    }
    
    const checkOutTime = new Date();
    const workEndTime = new Date();
    workEndTime.setHours(17, 0, 0, 0); // 5 PM
    
    const earlyLeaveMinutes = checkOutTime < workEndTime
      ? Math.floor((workEndTime.getTime() - checkOutTime.getTime()) / 60000)
      : 0;
    
    const workHours = attendance.checkIn
      ? (checkOutTime.getTime() - attendance.checkIn.getTime()) / 3600000
      : 0;
    
    attendance.checkOut = checkOutTime;
    attendance.earlyLeaveMinutes = earlyLeaveMinutes;
    attendance.workHours = Math.round(workHours * 100) / 100;
    await attendance.save();
    
    res.json(attendance);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Get today's attendance for employee
export const getTodayAttendance = async (req: any, res: Response) => {
  try {
    const { employeeId } = req.params;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const attendance = await DailyAttendance.findOne({
      employeeId,
      date: today
    });
    
    res.json(attendance || null);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Get monthly attendance
export const getMonthlyAttendance = async (req: any, res: Response) => {
  try {
    const { employeeId, year, month } = req.query;
    
    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate = new Date(Number(year), Number(month), 0);
    
    const attendance = await DailyAttendance.find({
      employeeId,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });
    
    res.json(attendance);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Get all employees attendance for today
export const getAllTodayAttendance = async (req: any, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const attendance = await DailyAttendance.find({ date: today })
      .populate('employeeId', 'name email position');
    
    res.json(attendance);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Mark absence/leave
export const markStatus = async (req: any, res: Response) => {
  try {
    const { employeeId, date, status, leaveType, notes } = req.body;
    
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);
    
    const existing = await DailyAttendance.findOne({
      employeeId,
      date: attendanceDate
    });
    
    if (existing) {
      existing.status = status;
      existing.leaveType = leaveType;
      existing.notes = notes;
      await existing.save();
      return res.json(existing);
    }
    
    const attendance = await DailyAttendance.create({
      employeeId,
      date: attendanceDate,
      status,
      leaveType,
      notes
    });
    
    res.status(201).json(attendance);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Get monthly report
export const getMonthlyReport = async (req: any, res: Response) => {
  try {
    const { year, month } = req.query;
    
    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate = new Date(Number(year), Number(month), 0);
    
    const employees = await Employee.find({ isActive: true });
    const reports = [];
    
    for (const employee of employees) {
      const attendance = await DailyAttendance.find({
        employeeId: employee._id,
        date: { $gte: startDate, $lte: endDate }
      });
      
      const present = attendance.filter(a => a.status === 'present' || a.status === 'late').length;
      const absent = attendance.filter(a => a.status === 'absent').length;
      const leave = attendance.filter(a => a.status === 'leave').length;
      const late = attendance.filter(a => a.status === 'late').length;
      const totalLateMinutes = attendance.reduce((sum, a) => sum + (a.lateMinutes || 0), 0);
      const totalWorkHours = attendance.reduce((sum, a) => sum + (a.workHours || 0), 0);
      
      reports.push({
        employee: {
          id: employee._id,
          name: employee.name,
          position: employee.position
        },
        present,
        absent,
        leave,
        late,
        totalLateMinutes,
        totalWorkHours: Math.round(totalWorkHours * 100) / 100,
        attendance
      });
    }
    
    res.json(reports);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Update attendance
export const updateAttendance = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { date, checkIn, checkOut, status, lateMinutes, leaveType, notes } = req.body;
    
    const attendance = await DailyAttendance.findById(id);
    if (!attendance) {
      return res.status(404).json({ message: 'سجل الحضور غير موجود' });
    }
    
    if (date) {
      const newDate = new Date(date);
      newDate.setHours(0, 0, 0, 0);
      attendance.date = newDate;
    }
    
    const dateStr = attendance.date.toISOString().split('T')[0];
    if (checkIn) attendance.checkIn = new Date(dateStr + 'T' + checkIn);
    if (checkOut) attendance.checkOut = new Date(dateStr + 'T' + checkOut);
    if (status) attendance.status = status;
    if (lateMinutes !== undefined) attendance.lateMinutes = lateMinutes;
    if (leaveType !== undefined) attendance.leaveType = leaveType;
    if (notes !== undefined) attendance.notes = notes;
    
    if (attendance.checkIn && attendance.checkOut) {
      const workHours = (attendance.checkOut.getTime() - attendance.checkIn.getTime()) / 3600000;
      attendance.workHours = Math.round(workHours * 100) / 100;
    }
    
    await attendance.save();
    res.json(attendance);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Delete attendance
export const deleteAttendance = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    
    const attendance = await DailyAttendance.findByIdAndDelete(id);
    if (!attendance) {
      return res.status(404).json({ message: 'سجل الحضور غير موجود' });
    }
    
    res.json({ message: 'تم حذف سجل الحضور بنجاح' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Manual entry
export const manualEntry = async (req: any, res: Response) => {
  try {
    const { employeeId, date, checkIn, checkOut, status, lateMinutes, leaveType, notes } = req.body;
    
    if (!employeeId || !date || !status) {
      return res.status(400).json({ message: 'الموظف والتاريخ والحالة مطلوبة' });
    }
    
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);
    
    const existing = await DailyAttendance.findOne({
      employeeId,
      date: attendanceDate
    });
    
    if (existing) {
      return res.status(400).json({ message: 'تم تسجيل حضور هذا الموظف في هذا اليوم بالفعل' });
    }
    
    const dateStr = attendanceDate.toISOString().split('T')[0];
    let checkInDate, checkOutDate;
    if (checkIn) checkInDate = new Date(dateStr + 'T' + checkIn);
    if (checkOut) checkOutDate = new Date(dateStr + 'T' + checkOut);
    
    const workHours = checkInDate && checkOutDate 
      ? (checkOutDate.getTime() - checkInDate.getTime()) / 3600000
      : 0;
    
    const attendanceData: any = {
      employeeId,
      date: attendanceDate,
      status,
      lateMinutes: lateMinutes || 0,
      workHours: Math.round(workHours * 100) / 100
    };
    
    if (checkInDate) attendanceData.checkIn = checkInDate;
    if (checkOutDate) attendanceData.checkOut = checkOutDate;
    if (leaveType) attendanceData.leaveType = leaveType;
    if (notes) attendanceData.notes = notes;
    
    const attendance = await DailyAttendance.create(attendanceData);
    
    res.status(201).json(attendance);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
