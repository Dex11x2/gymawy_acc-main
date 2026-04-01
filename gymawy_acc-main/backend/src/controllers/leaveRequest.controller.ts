import { Request, Response } from 'express';
import LeaveRequest from '../models/LeaveRequest';
import Employee from '../models/Employee';

export const getAll = async (req: any, res: Response) => {
  try {
    const leaveRequests = await LeaveRequest.find({ companyId: req.user.companyId })
      .populate('employeeId', 'name email')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 });
    res.json(leaveRequests);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req: any, res: Response) => {
  try {
    const { employeeId, leaveType, startDate, endDate, reason } = req.body;
    
    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // التحقق من الرصيد
    if (leaveType === 'annual' && employee.leaveBalance.annual < days) {
      return res.status(400).json({ 
        message: `رصيد الإجازات العادية غير كافٍ. الرصيد المتاح: ${employee.leaveBalance.annual} يوم من أصل 21 يوم` 
      });
    }
    
    if (leaveType === 'emergency' && employee.leaveBalance.emergency < days) {
      return res.status(400).json({ 
        message: `رصيد الإجازات العارضة غير كافٍ. الرصيد المتاح: ${employee.leaveBalance.emergency} يوم من أصل 7 أيام` 
      });
    }
    
    if (leaveType === 'sick' && employee.leaveBalance.annual < days) {
      return res.status(400).json({ 
        message: `رصيد الإجازات غير كافٍ. الرصيد المتاح: ${employee.leaveBalance.annual} يوم من أصل 21 يوم` 
      });
    }
    
    const leaveRequest = await LeaveRequest.create({
      employeeId,
      employeeName: employee.name,
      leaveType,
      startDate: start,
      endDate: end,
      days,
      reason,
      companyId: req.user.companyId,
      status: 'pending'
    });
    
    res.status(201).json(leaveRequest);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateStatus = async (req: any, res: Response) => {
  try {
    const { status, reviewNotes, deductFromEmergency } = req.body;
    const leaveRequest = await LeaveRequest.findById(req.params.id);
    
    if (!leaveRequest) return res.status(404).json({ message: 'Leave request not found' });
    
    leaveRequest.status = status;
    leaveRequest.reviewedBy = req.user.userId;
    leaveRequest.reviewedAt = new Date();
    leaveRequest.reviewNotes = reviewNotes;
    
    await leaveRequest.save();
    
    // خصم من الرصيد عند الموافقة
    if (status === 'approved') {
      const employee = await Employee.findById(leaveRequest.employeeId);
      if (employee) {
        // إذا كان المدير اختار الخصم من العارضة
        if (deductFromEmergency && (leaveRequest.leaveType === 'annual' || leaveRequest.leaveType === 'sick')) {
          if (employee.leaveBalance.emergency >= leaveRequest.days) {
            employee.leaveBalance.emergency -= leaveRequest.days;
          } else {
            return res.status(400).json({ message: 'رصيد الإجازات العارضة غير كافٍ' });
          }
        } else {
          // الخصم العادي
          if (leaveRequest.leaveType === 'annual') {
            employee.leaveBalance.annual -= leaveRequest.days;
          } else if (leaveRequest.leaveType === 'emergency') {
            employee.leaveBalance.emergency -= leaveRequest.days;
          } else if (leaveRequest.leaveType === 'sick') {
            employee.leaveBalance.annual -= leaveRequest.days;
          }
        }
        await employee.save();
      }
    }
    
    res.json(leaveRequest);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateLeaveBalance = async (req: any, res: Response) => {
  try {
    const { employeeId, annual, emergency } = req.body;
    
    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    
    if (annual !== undefined) employee.leaveBalance.annual = annual;
    if (emergency !== undefined) employee.leaveBalance.emergency = emergency;
    
    await employee.save();
    res.json({ message: 'تم تحديث رصيد الإجازات بنجاح', leaveBalance: employee.leaveBalance });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getEmployeeBalance = async (req: Request, res: Response) => {
  try {
    const employee = await Employee.findById(req.params.employeeId);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    
    res.json({ leaveBalance: employee.leaveBalance });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    await LeaveRequest.findByIdAndDelete(req.params.id);
    res.json({ message: 'Leave request deleted' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
