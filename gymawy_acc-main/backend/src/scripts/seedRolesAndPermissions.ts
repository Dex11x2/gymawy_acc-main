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

    // Idempotent upsert: preserve existing _ids so User.roleId references stay valid
    const insertedRoles = [];
    for (const r of roles) {
      const role = await Role.findOneAndUpdate(
        { nameEn: r.nameEn },
        { $set: r },
        { upsert: true, new: true }
      );
      insertedRoles.push(role!);
    }
    console.log(`✅ Roles upserted (${insertedRoles.length})`);

    const insertedPages = [];
    for (const p of pages) {
      const page = await Page.findOneAndUpdate(
        { module: p.module },
        { $set: p },
        { upsert: true, new: true }
      );
      insertedPages.push(page!);
    }
    console.log(`✅ Pages upserted (${insertedPages.length})`);

    // RolePermissions are derived; safe to recompute every run
    await RolePermission.deleteMany({});

    // On fresh install, only the super admin (level 4) starts with full access.
    // Lower roles begin with no permissions; the super admin distributes them
    // through the RolePermissionsManager screen, and managers redistribute to
    // those below them via the same screen.
    const permissions = [];
    for (const role of insertedRoles) {
      for (const page of insertedPages) {
        const isSuperAdmin = role.level === 4;
        permissions.push({
          roleId: role._id,
          pageId: page._id,
          canView: isSuperAdmin,
          canCreate: isSuperAdmin,
          canEdit: isSuperAdmin,
          canDelete: isSuperAdmin,
          canExport: isSuperAdmin,
        });
      }
    }

    await RolePermission.insertMany(permissions);
    console.log(`✅ Permissions created (${permissions.length}) — super admin only on fresh install`);

    console.log('\n🎉 Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

seed();
