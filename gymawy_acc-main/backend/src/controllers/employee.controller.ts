import { Request, Response } from 'express';
import Employee from '../models/Employee';

export const getAll = async (req: any, res: Response) => {
  try {
    const employees = await Employee.find().populate('userId').populate('departmentId');
    
    // إضافة الصلاحيات من User إلى Employee
    const employeesWithPermissions = employees.map(emp => {
      const empObj: any = emp.toObject();
      if (empObj.userId && typeof empObj.userId === 'object' && 'permissions' in empObj.userId) {
        empObj.permissions = empObj.userId.permissions || [];
      }
      return empObj;
    });
    
    res.json(employeesWithPermissions);
  } catch (error: any) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req: any, res: Response) => {
  try {
    console.log('Creating employee with data:', req.body);
    const User = (await import('../models/User')).default;
    const Employee = (await import('../models/Employee')).default;
    
    const currentUser = await User.findById(req.user.userId);
    const isCreatingGeneralManager = req.body.isGeneralManager;
    const isCreatingAdministrativeManager = req.body.isAdministrativeManager;
    
    // التحقق من صلاحية إنشاء مدير عام
    if (isCreatingGeneralManager) {
      if (currentUser?.role !== 'super_admin' && currentUser?.role !== 'general_manager') {
        return res.status(403).json({ 
          message: 'فقط السوبر أدمن والمدير العام يمكنهم إنشاء مدير عام' 
        });
      }
    }
    
    // التحقق من صلاحية إنشاء مدير إداري
    if (isCreatingAdministrativeManager) {
      if (currentUser?.role !== 'super_admin' && currentUser?.role !== 'general_manager') {
        return res.status(403).json({ 
          message: 'فقط السوبر أدمن والمدير العام يمكنهم إنشاء مدير إداري' 
        });
      }
    }
    
    const existingUser = await User.findOne({ email: req.body.email });
    let user;
    
    if (existingUser) {
      user = existingUser;
      if (req.body.departmentId) {
        console.log('Updating existing user with departmentId:', req.body.departmentId);
        user.departmentId = req.body.departmentId;
        await user.save();
      }
    } else {
      const plainPassword = req.body.password || 'employee123';
      
      // تحديد الدور بناءً على نوع الموظف
      let userRole = 'employee';
      if (req.body.isGeneralManager) {
        userRole = 'general_manager';
      } else if (req.body.isAdministrativeManager) {
        userRole = 'administrative_manager';
      }
      
      const userData = {
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        password: plainPassword,
        plainPassword: plainPassword,
        role: userRole,
        companyId: req.user?.companyId || null,
        departmentId: req.body.departmentId || null,
        isActive: true,
        permissions: []
      };
      console.log('Creating new user with userData:', { ...userData, password: '***' });
      user = await User.create(userData);
      console.log('✅ User created successfully with email:', user.email, 'and plainPassword:', plainPassword);
    }
    
    // Convert departmentId to ObjectId if it's a string
    const mongoose = await import('mongoose');
    const departmentId = req.body.departmentId ? 
      (typeof req.body.departmentId === 'string' ? new mongoose.Types.ObjectId(req.body.departmentId) : req.body.departmentId) 
      : null;
    
    const employeeData = {
      userId: user._id,
      companyId: req.user?.companyId || null,
      departmentId: departmentId,
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      position: req.body.position,
      salary: req.body.salary,
      salaryCurrency: req.body.salaryCurrency || 'EGP',
      hireDate: req.body.hireDate || new Date(),
      isGeneralManager: req.body.isGeneralManager || false,
      isAdministrativeManager: req.body.isAdministrativeManager || false,
      isActive: true
    };
    
    console.log('Creating employee with employeeData:', employeeData);
    const employee = await Employee.create(employeeData);
    console.log('Employee created successfully with departmentId:', employee.departmentId);
    res.status(201).json(employee);
  } catch (error: any) {
    console.error('Employee creation error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

export const getById = async (req: Request, res: Response) => {
  try {
    const employee = await Employee.findById(req.params.id).populate('userId departmentId');
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    
    // إضافة الصلاحيات من User
    const empObj: any = employee.toObject();
    if (empObj.userId && typeof empObj.userId === 'object' && 'permissions' in empObj.userId) {
      empObj.permissions = empObj.userId.permissions || [];
    }
    
    res.json(empObj);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    console.log('\n=== UPDATING EMPLOYEE ===');
    console.log('Employee ID:', req.params.id);
    console.log('Update data:', req.body);

    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    // حفظ الإيميل القديم لتحديث ReportSettings
    const oldEmail = employee.email;
    const oldName = employee.name;

    const mongoose = await import('mongoose');
    const departmentId = req.body.departmentId ?
      (typeof req.body.departmentId === 'string' ? new mongoose.Types.ObjectId(req.body.departmentId) : req.body.departmentId)
      : null;
    
    // Update User data (name, email, phone, role, departmentId)
    if (employee.userId) {
      const User = (await import('../models/User')).default;
      const userUpdateData: any = {};
      
      // Update basic info
      if (req.body.name) userUpdateData.name = req.body.name;
      if (req.body.email) userUpdateData.email = req.body.email;
      if (req.body.phone) userUpdateData.phone = req.body.phone;
      if (departmentId) userUpdateData.departmentId = departmentId;
      
      // Update role based on manager status
      if (req.body.isGeneralManager !== undefined || req.body.isAdministrativeManager !== undefined) {
        const isGeneralManager = req.body.isGeneralManager ?? employee.isGeneralManager;
        const isAdministrativeManager = req.body.isAdministrativeManager ?? employee.isAdministrativeManager;
        
        if (isGeneralManager) {
          userUpdateData.role = 'general_manager';
        } else if (isAdministrativeManager) {
          userUpdateData.role = 'administrative_manager';
        } else {
          userUpdateData.role = 'employee';
        }
      }
      
      if (Object.keys(userUpdateData).length > 0) {
        const updatedUser = await User.findByIdAndUpdate(employee.userId, userUpdateData, { new: true });
        console.log('✅ User updated:', updatedUser);
      }
    }
    
    // Update Employee
    const updateData = { ...req.body };
    if (departmentId) {
      updateData.departmentId = departmentId;
    }
    
    const updatedEmployee = await Employee.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('userId').populate('departmentId');

    // مزامنة ReportSettings - تحديث الإيميل والاسم في قائمة المستلمين
    if (req.body.email || req.body.name) {
      const ReportSettings = (await import('../models/ReportSettings')).default;
      const newEmail = req.body.email || oldEmail;
      const newName = req.body.name || oldName;

      // البحث عن المستلم بالإيميل القديم وتحديثه
      await ReportSettings.updateMany(
        { 'recipients.email': oldEmail },
        {
          $set: {
            'recipients.$.email': newEmail,
            'recipients.$.name': newName
          }
        }
      );
      console.log(`✅ ReportSettings synced: ${oldEmail} → ${newEmail}`);
    }

    console.log('✅ Employee updated successfully');
    console.log('=========================\n');

    res.json(updatedEmployee);
  } catch (error: any) {
    console.error('❌ Error updating employee:', error);
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    
    const User = (await import('../models/User')).default;
    
    // حذف حساب User المرتبط
    if (employee.userId) {
      await User.findByIdAndDelete(employee.userId);
    }
    
    // حذف Employee
    await Employee.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Employee and user account deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updatePassword = async (req: any, res: Response) => {
  try {
    const { newPassword } = req.body;
    
    if (!newPassword) {
      return res.status(400).json({ message: 'يجب إدخال كلمة مرور جديدة' });
    }
    
    const employee = await Employee.findById(req.params.id).populate('userId');
    
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    
    const User = (await import('../models/User')).default;
    
    if (!employee.userId) {
      const existingUser = await User.findOne({ email: employee.email });
      if (existingUser) {
        employee.userId = existingUser._id as any;
        await employee.save();
        
        existingUser.password = newPassword;
        existingUser.plainPassword = newPassword;
        await existingUser.save();
        
        return res.json({ message: 'تم ربط الحساب الموجود وتحديث كلمة المرور بنجاح' });
      }
      
      const newUser = await User.create({
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        password: newPassword,
        plainPassword: newPassword,
        role: employee.isGeneralManager ? 'general_manager' : employee.isAdministrativeManager ? 'administrative_manager' : 'employee',
        companyId: employee.companyId,
        departmentId: employee.departmentId,
        isActive: true,
        permissions: []
      });
      
      employee.userId = newUser._id as any;
      await employee.save();
      
      return res.json({ message: 'تم إنشاء حساب جديد وتحديث كلمة المرور بنجاح' });
    }
    
    const currentUser = await User.findById(req.user.userId);
    const targetUser = await User.findById(employee.userId);
    
    if (!targetUser) {
      return res.status(404).json({ 
        message: 'User account not found',
        details: `Employee ${employee.name} (${employee.email}) has userId: ${employee.userId} but user not found in database`
      });
    }
    
    if (currentUser?.role === 'administrative_manager' && targetUser.role !== 'employee') {
      return res.status(403).json({ message: 'المدير الإداري يمكنه فقط تعديل كلمات مرور الموظفين' });
    }
    
    if (currentUser?.role === 'general_manager' && targetUser.role === 'super_admin') {
      return res.status(403).json({ message: 'لا يمكن تعديل كلمة مرور السوبر أدمن' });
    }
    
    targetUser.password = newPassword;
    targetUser.plainPassword = newPassword;
    await targetUser.save();
    
    res.json({ message: 'تم تحديث كلمة المرور بنجاح' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const toggleActive = async (req: Request, res: Response) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    
    const User = (await import('../models/User')).default;
    const user = await User.findById(employee.userId);
    
    if (!user) return res.status(404).json({ message: 'User account not found' });
    
    // تبديل حالة الحساب
    user.isActive = !user.isActive;
    await user.save();
    
    employee.isActive = user.isActive;
    await employee.save();
    
    res.json({ 
      message: user.isActive ? 'تم تفعيل الحساب' : 'تم تعطيل الحساب',
      isActive: user.isActive
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updatePermissions = async (req: Request, res: Response) => {
  try {
    const { permissions } = req.body;
    console.log('\n=== UPDATING PERMISSIONS ===');
    console.log('📝 Employee ID:', req.params.id);
    console.log('📝 New permissions:', JSON.stringify(permissions, null, 2));
    
    const employee = await Employee.findById(req.params.id);
    
    if (!employee) {
      console.log('❌ Employee not found');
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    const User = (await import('../models/User')).default;
    const user = await User.findById(employee.userId);
    
    if (!user) {
      console.error('❌ User not found for employee:', employee.email);
      return res.status(404).json({ message: 'User account not found' });
    }
    
    console.log('👤 Found user:', user.email, '(ID:', user._id, ')');
    console.log('📋 Old permissions in DB:', JSON.stringify(user.permissions, null, 2));
    
    user.permissions = permissions;
    const savedUser = await user.save();
    
    console.log('✅ Permissions SAVED to MongoDB successfully!');
    console.log('📋 New permissions in DB:', JSON.stringify(savedUser.permissions, null, 2));
    console.log('=========================\n');
    
    res.json({ message: 'تم تحديث الصلاحيات بنجاح', permissions: savedUser.permissions });
  } catch (error: any) {
    console.error('❌ Error updating permissions:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getPlainPassword = async (req: any, res: Response) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    
    const User = (await import('../models/User')).default;
    const user = await User.findById(employee.userId);
    
    if (!user) return res.status(404).json({ message: 'User account not found' });
    
    res.json({ plainPassword: user.plainPassword || null });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
