import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Role from '../models/Role';
import Page from '../models/Page';
import RolePermission from '../models/RolePermission';

dotenv.config();

const roles = [
  { name: 'موظف', nameEn: 'Employee', level: 1 },
  { name: 'مدير إداري', nameEn: 'Administrative Manager', level: 2 },
  { name: 'مدير عام', nameEn: 'General Manager', level: 3 },
  { name: 'سوبر أدمِن', nameEn: 'Super Admin', level: 4 }
];

const pages = [
  { name: 'لوحة التحكم', nameEn: 'Dashboard', path: '/dashboard', icon: '📊', module: 'dashboard' },
  { name: 'تسجيل الحضور', nameEn: 'Attendance', path: '/attendance-system', icon: '🎯', module: 'attendance_system' },
  { name: 'إدارة الحضور', nameEn: 'Attendance Management', path: '/attendance-management', icon: '📊', module: 'attendance_management' },
  { name: 'الفروع والمحافظات', nameEn: 'Branches', path: '/branches', icon: '🏢', module: 'branches' },
  { name: 'الأقسام', nameEn: 'Departments', path: '/departments', icon: '🏢', module: 'departments' },
  { name: 'الموظفين', nameEn: 'Employees', path: '/employees', icon: '👥', module: 'employees' },
  { name: 'الرواتب', nameEn: 'Payroll', path: '/payroll', icon: '💵', module: 'payroll' },
  { name: 'الإيرادات', nameEn: 'Revenues', path: '/revenues', icon: '📈', module: 'revenues' },
  { name: 'المصروفات', nameEn: 'Expenses', path: '/expenses', icon: '📉', module: 'expenses' },
  { name: 'العهد والسلف', nameEn: 'Custody', path: '/custody', icon: '🍪', module: 'custody' },
  { name: 'المهام', nameEn: 'Tasks', path: '/tasks', icon: '📋', module: 'tasks' },
  { name: 'المحادثات', nameEn: 'Chat', path: '/chat', icon: '💬', module: 'chat' },
  { name: 'المنشورات', nameEn: 'Posts', path: '/posts', icon: '📢', module: 'posts' },
  { name: 'تقييمات الموظفين', nameEn: 'Employee Reviews', path: '/reviews', icon: '⭐', module: 'reviews' },
  { name: 'التقارير', nameEn: 'Reports', path: '/reports', icon: '📊', module: 'reports' },
  { name: 'تقرير عمليات تمويل الإعلانات', nameEn: 'Ads Funding Report', path: '/ads-funding-report', icon: '📱', module: 'ads_funding' },
  { name: 'الشكاوى والمقترحات', nameEn: 'Complaints', path: '/complaints', icon: '📝', module: 'complaints' },
  { name: 'التعليمات', nameEn: 'Instructions', path: '/instructions', icon: '📖', module: 'instructions' },
  { name: 'المناسبات', nameEn: 'Occasions', path: '/occasions', icon: '🎉', module: 'occasions' }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await Role.deleteMany({});
    await Page.deleteMany({});
    await RolePermission.deleteMany({});

    // Insert roles
    const insertedRoles = await Role.insertMany(roles);
    console.log('✅ Roles created');

    // Insert pages
    const insertedPages = await Page.insertMany(pages);
    console.log('✅ Pages created');

    // Create permissions
    const permissions = [];
    
    for (const role of insertedRoles) {
      for (const page of insertedPages) {
        let canView = false, canCreate = false, canEdit = false, canDelete = false, canExport = false;

        if (role.level === 4) { // Super Admin
          canView = canCreate = canEdit = canDelete = canExport = true;
        } else if (role.level === 3) { // General Manager
          canView = canCreate = canEdit = canDelete = canExport = true;
        } else if (role.level === 2) { // Administrative Manager
          canView = canCreate = canEdit = canExport = true;
          canDelete = ['tasks', 'chat', 'posts'].includes(page.module);
        } else if (role.level === 1) { // Employee
          canView = ['dashboard', 'attendance_system', 'employees', 'payroll', 'custody', 'tasks', 'chat', 'posts', 'reviews', 'complaints', 'instructions', 'occasions', 'ads_funding'].includes(page.module);
          canCreate = ['attendance_system', 'custody', 'tasks', 'chat', 'posts', 'complaints'].includes(page.module);
          canEdit = ['tasks'].includes(page.module);
        }

        permissions.push({
          roleId: role._id,
          pageId: page._id,
          canView,
          canCreate,
          canEdit,
          canDelete,
          canExport
        });
      }
    }

    await RolePermission.insertMany(permissions);
    console.log('✅ Permissions created');

    console.log('\n🎉 Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

seed();
