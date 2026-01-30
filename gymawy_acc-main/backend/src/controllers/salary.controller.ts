import { Request, Response } from 'express';
import Salary from '../models/Salary';
import Employee from '../models/Employee';
import { ensureId } from '../utils/mongooseHelper';

// Get all salaries for a specific month/year
export const getSalaries = async (req: any, res: Response) => {
  try {
    const { month, year } = req.query;

    // ✅ FIXED: Managers see ALL salaries, regular employees see only their company's salaries
    const managerRoles = ['super_admin', 'administrative_manager', 'general_manager'];
    const query: any = {};

    if (month) query.month = Number(month);
    if (year) query.year = Number(year);

    // Force companyId filter unless user is a manager
    if (!managerRoles.includes(req.user?.role)) {
      query.companyId = req.user?.companyId;
    }

    const salaries = await Salary.find(query)
      .populate('employeeId', 'name email position salary salaryCurrency')
      .populate('paidBy', 'name email')
      .sort({ 'employeeId.name': 1 });

    // Filter out salaries with invalid or missing employeeId
    const validSalaries = salaries.filter(salary => {
      if (!salary.employeeId) {
        console.warn(`Salary ${salary._id} has no valid employeeId`);
        return false;
      }
      return true;
    });

    // Convert to JSON and ensure _id is present
    const salariesJSON = ensureId(validSalaries);

    console.log('📤 Sending salaries:', {
      count: salariesJSON.length,
      sampleId: salariesJSON[0]?._id,
      sampleKeys: salariesJSON[0] ? Object.keys(salariesJSON[0]) : []
    });

    res.json(salariesJSON);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Get salary by ID
export const getSalaryById = async (req: Request, res: Response) => {
  try {
    // Validate the ID parameter
    if (!req.params.id || req.params.id === 'undefined') {
      return res.status(400).json({ message: 'Invalid salary ID' });
    }

    const salary = await Salary.findById(req.params.id)
      .populate('employeeId', 'name email position salary salaryCurrency')
      .populate('paidBy', 'name email')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!salary) {
      return res.status(404).json({ message: 'Salary record not found' });
    }

    res.json(salary);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Generate salaries for all employees for a specific month/year
export const generateMonthlySalaries = async (req: any, res: Response) => {
  try {
    const { month, year } = req.body;

    console.log('🔥 Generate salaries request:', { month, year, user: req.user });

    if (!month || !year) {
      console.error('❌ Month and year are required');
      return res.status(400).json({ message: 'Month and year are required' });
    }

    // ✅ FIXED: Managers see ALL employees, regular employees see only their company's employees
    const managerRoles = ['super_admin', 'administrative_manager', 'general_manager'];
    const query: any = { isActive: true };

    // Force companyId filter unless user is a manager
    if (!managerRoles.includes(req.user?.role)) {
      query.companyId = req.user?.companyId;
    }

    console.log('🔍 Searching for employees with query:', query);
    const employees = await Employee.find(query);
    console.log(`✅ Found ${employees.length} active employees`);

    if (employees.length === 0) {
      console.warn('⚠️ No active employees found');
      return res.json({
        message: 'No active employees found',
        created: 0,
        skipped: 0,
        details: { created: [], skipped: [] }
      });
    }

    const created = [];
    const skipped = [];

    for (const employee of employees) {
      console.log(`Processing employee: ${employee.name} (${employee._id})`);

      // Check if salary already exists
      const existingSalary = await Salary.findOne({
        employeeId: employee._id,
        month: Number(month),
        year: Number(year)
      });

      if (existingSalary) {
        console.log(`⏭️ Skipping ${employee.name} - salary already exists`);
        skipped.push({ employeeId: employee._id, name: employee.name });
        continue;
      }

      // Create new salary record
      const salary = new Salary({
        employeeId: employee._id,
        companyId: employee.companyId,
        month: Number(month),
        year: Number(year),
        baseSalary: employee.salary,
        currency: employee.salaryCurrency,
        bonuses: [],
        allowances: [],
        deductions: [],
        lateDeductions: [],
        absenceDeductions: [],
        isPaid: false,
        createdBy: (req as any).user?.id
      });

      await salary.save();
      console.log(`✅ Created salary for ${employee.name}`);
      created.push({ employeeId: employee._id, name: employee.name });
    }

    const response = {
      message: 'Monthly salaries generated',
      created: created.length,
      skipped: skipped.length,
      details: { created, skipped }
    };

    console.log('📊 Generation complete:', response);
    res.json(response);
  } catch (error: any) {
    console.error('❌ Error generating salaries:', error);
    res.status(500).json({ message: error.message });
  }
};

// Create or update salary
export const createOrUpdateSalary = async (req: Request, res: Response) => {
  try {
    const {
      employeeId,
      month,
      year,
      baseSalary,
      currency,
      bonuses,
      allowances,
      deductions,
      lateDeductions,
      absenceDeductions,
      notes,
      companyId
    } = req.body;

    if (!employeeId || !month || !year || baseSalary === undefined) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if salary already exists
    let salary = await Salary.findOne({
      employeeId,
      month: Number(month),
      year: Number(year)
    });

    if (salary) {
      // Update existing salary
      salary.baseSalary = baseSalary;
      salary.currency = currency || salary.currency;
      salary.bonuses = bonuses || [];
      salary.allowances = allowances || [];
      salary.deductions = deductions || [];
      salary.lateDeductions = lateDeductions || [];
      salary.absenceDeductions = absenceDeductions || [];
      salary.notes = notes;
      salary.updatedBy = (req as any).user?.id;

      await salary.save();

      // Update employee base salary if changed
      const employee = await Employee.findById(employeeId);
      if (employee && employee.salary !== baseSalary) {
        employee.salary = baseSalary;
        if (currency) employee.salaryCurrency = currency;
        await employee.save();
      }

      res.json(salary);
    } else {
      // Create new salary
      salary = new Salary({
        employeeId,
        companyId,
        month: Number(month),
        year: Number(year),
        baseSalary,
        currency: currency || 'EGP',
        bonuses: bonuses || [],
        allowances: allowances || [],
        deductions: deductions || [],
        lateDeductions: lateDeductions || [],
        absenceDeductions: absenceDeductions || [],
        notes,
        createdBy: (req as any).user?.id
      });

      await salary.save();

      // Update employee base salary if changed
      const employee = await Employee.findById(employeeId);
      if (employee && employee.salary !== baseSalary) {
        employee.salary = baseSalary;
        if (currency) employee.salaryCurrency = currency;
        await employee.save();
      }

      res.status(201).json(salary);
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Update salary
export const updateSalary = async (req: Request, res: Response) => {
  try {
    // Validate the ID parameter
    if (!req.params.id || req.params.id === 'undefined') {
      return res.status(400).json({ message: 'Invalid salary ID' });
    }

    const {
      baseSalary,
      currency,
      bonuses,
      allowances,
      deductions,
      lateDeductions,
      absenceDeductions,
      notes
    } = req.body;

    const salary = await Salary.findById(req.params.id);
    if (!salary) {
      return res.status(404).json({ message: 'Salary record not found' });
    }

    // Update fields
    if (baseSalary !== undefined) salary.baseSalary = baseSalary;
    if (currency) salary.currency = currency;
    if (bonuses) salary.bonuses = bonuses;
    if (allowances) salary.allowances = allowances;
    if (deductions) salary.deductions = deductions;
    if (lateDeductions) salary.lateDeductions = lateDeductions;
    if (absenceDeductions) salary.absenceDeductions = absenceDeductions;
    if (notes !== undefined) salary.notes = notes;
    salary.updatedBy = (req as any).user?.id;

    await salary.save();

    // Update employee base salary if changed
    if (baseSalary !== undefined) {
      const employee = await Employee.findById(salary.employeeId);
      if (employee && employee.salary !== baseSalary) {
        employee.salary = baseSalary;
        if (currency) employee.salaryCurrency = currency;
        await employee.save();
      }
    }

    res.json(salary);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Toggle payment status
export const togglePaymentStatus = async (req: Request, res: Response) => {
  try {
    const { paymentMethod, paymentReference } = req.body;

    // Validate the ID parameter
    if (!req.params.id || req.params.id === 'undefined') {
      return res.status(400).json({ message: 'Invalid salary ID' });
    }

    const salary = await Salary.findById(req.params.id);
    if (!salary) {
      return res.status(404).json({ message: 'Salary record not found' });
    }

    salary.isPaid = !salary.isPaid;

    if (salary.isPaid) {
      salary.paidAt = new Date();
      salary.paidBy = (req as any).user?.id;
      if (paymentMethod) salary.paymentMethod = paymentMethod;
      if (paymentReference) salary.paymentReference = paymentReference;
    } else {
      salary.paidAt = undefined;
      salary.paidBy = undefined;
      salary.paymentMethod = undefined;
      salary.paymentReference = undefined;
    }

    await salary.save();
    res.json(salary);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Delete salary
export const deleteSalary = async (req: Request, res: Response) => {
  try {
    // Validate the ID parameter
    if (!req.params.id || req.params.id === 'undefined') {
      return res.status(400).json({ message: 'Invalid salary ID' });
    }

    const salary = await Salary.findByIdAndDelete(req.params.id);
    if (!salary) {
      return res.status(404).json({ message: 'Salary record not found' });
    }

    res.json({ message: 'Salary record deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Get salary statistics
export const getSalaryStatistics = async (req: any, res: Response) => {
  try {
    const { month, year } = req.query;

    // ✅ FIXED: Managers see ALL statistics, regular employees see only their company's statistics
    const managerRoles = ['super_admin', 'administrative_manager', 'general_manager'];
    const query: any = {};

    if (month) query.month = Number(month);
    if (year) query.year = Number(year);

    // Force companyId filter unless user is a manager
    if (!managerRoles.includes(req.user?.role)) {
      query.companyId = req.user?.companyId;
    }

    const salaries = await Salary.find(query);

    const stats = {
      totalEmployees: salaries.length,
      totalBaseSalary: salaries.reduce((sum, s) => sum + s.baseSalary, 0),
      totalBonuses: salaries.reduce((sum, s) => sum + s.totalBonuses, 0),
      totalAllowances: salaries.reduce((sum, s) => sum + s.totalAllowances, 0),
      totalDeductions: salaries.reduce((sum, s) => sum + s.totalDeductions, 0),
      totalLateDeductions: salaries.reduce((sum, s) => sum + s.totalLateDeductions, 0),
      totalAbsenceDeductions: salaries.reduce((sum, s) => sum + s.totalAbsenceDeductions, 0),
      totalNetSalary: salaries.reduce((sum, s) => sum + s.netSalary, 0),
      paidCount: salaries.filter(s => s.isPaid).length,
      unpaidCount: salaries.filter(s => !s.isPaid).length,
      totalPaid: salaries.filter(s => s.isPaid).reduce((sum, s) => sum + s.netSalary, 0),
      totalUnpaid: salaries.filter(s => !s.isPaid).reduce((sum, s) => sum + s.netSalary, 0)
    };

    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
