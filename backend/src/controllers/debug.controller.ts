import { Request, Response } from 'express';
import User from '../models/User';

export const listUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find({}).select('email name role plainPassword');
    const userList = users.map(u => ({
      email: u.email,
      name: u.name,
      role: u.role,
      password: u.plainPassword || 'Not available'
    }));
    res.json(userList);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const resetAllPasswords = async (req: Request, res: Response) => {
  try {
    const users = await User.find({ role: 'employee' });
    const results = [];
    
    for (const user of users) {
      const newPassword = 'employee123';
      user.password = newPassword;
      user.plainPassword = newPassword;
      await user.save();
      
      results.push({
        email: user.email,
        name: user.name,
        newPassword: newPassword
      });
    }
    
    res.json({
      message: 'تم إعادة تعيين كلمات المرور بنجاح',
      users: results
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const resetUserPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    const { password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const newPassword = password || 'employee123';
    user.password = newPassword;
    user.plainPassword = newPassword;
    await user.save();
    
    res.json({
      message: 'تم إعادة تعيين كلمة المرور بنجاح',
      email: user.email,
      name: user.name,
      newPassword: newPassword
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createUserForEmployee = async (req: Request, res: Response) => {
  try {
    const Employee = (await import('../models/Employee')).default;
    const Company = (await import('../models/Company')).default;
    
    // الحصول على أول شركة
    const company = await Company.findOne();
    const defaultCompanyId = company?._id;
    
    const employees = await Employee.find({}).populate('userId');
    const results = [];
    
    for (const emp of employees) {
      const empCompanyId = emp.companyId || defaultCompanyId;
      
      // إذا لم يكن لديه user
      if (!emp.userId) {
        const existingUser = await User.findOne({ email: emp.email });
        
        if (!existingUser) {
          const newPassword = 'employee123';
          const newUser = await User.create({
            name: emp.name,
            email: emp.email,
            phone: emp.phone,
            password: newPassword,
            plainPassword: newPassword,
            role: 'employee',
            companyId: empCompanyId,
            departmentId: emp.departmentId,
            isActive: true,
            permissions: []
          });
          
          // ربط Employee بـ User وتحديث companyId
          emp.userId = newUser._id as any;
          emp.companyId = empCompanyId as any;
          await emp.save();
          
          results.push({
            email: emp.email,
            name: emp.name,
            password: newPassword,
            companyId: empCompanyId,
            status: 'created'
          });
        } else {
          // تحديث User بـ companyId
          existingUser.companyId = empCompanyId as any;
          if (!existingUser.plainPassword) {
            existingUser.password = 'employee123';
            existingUser.plainPassword = 'employee123';
          }
          await existingUser.save();
          
          // ربط Employee بـ User
          emp.userId = existingUser._id as any;
          emp.companyId = empCompanyId as any;
          await emp.save();
          
          results.push({
            email: emp.email,
            name: emp.name,
            password: existingUser.plainPassword,
            companyId: empCompanyId,
            status: 'linked & updated'
          });
        }
      } else {
        // تحديث companyId للمستخدم الموجود
        const existingUser = await User.findById(emp.userId);
        if (existingUser && !existingUser.companyId) {
          existingUser.companyId = empCompanyId as any;
          await existingUser.save();
          
          emp.companyId = empCompanyId as any;
          await emp.save();
          
          results.push({
            email: emp.email,
            name: emp.name,
            companyId: empCompanyId,
            status: 'companyId updated'
          });
        } else {
          results.push({
            email: emp.email,
            name: emp.name,
            status: 'already complete'
          });
        }
      }
    }
    
    res.json({
      message: 'تم إنشاء/تحديث حسابات المستخدمين',
      defaultCompanyId,
      results
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
