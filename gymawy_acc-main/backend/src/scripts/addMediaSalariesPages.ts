import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Page from '../models/Page';
import Role from '../models/Role';
import RolePermission from '../models/RolePermission';

dotenv.config();

const newPages = [
  {
    name: 'إعدادات أسعار المحتوى',
    nameEn: 'Content Prices Settings',
    path: '/media-salaries',
    icon: '💰',
    module: 'media_salaries_prices'
  },
  {
    name: 'إنجازات الموظفين',
    nameEn: 'Employee Achievements',
    path: '/media-salaries',
    icon: '🏆',
    module: 'media_salaries_achievements'
  }
];

async function addPages() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB');

    // Get all roles
    const roles = await Role.find();
    console.log(`📋 Found ${roles.length} roles`);

    for (const pageData of newPages) {
      // Check if page already exists
      const existingPage = await Page.findOne({ module: pageData.module });

      if (existingPage) {
        console.log(`⏭️ Page "${pageData.name}" already exists, skipping...`);
        continue;
      }

      // Create new page
      const newPage = await Page.create(pageData);
      console.log(`✅ Created page: ${pageData.name}`);

      // Create permissions for all roles
      for (const role of roles) {
        let canView = false, canCreate = false, canEdit = false, canDelete = false, canExport = false;

        if (role.level === 4) { // Super Admin
          canView = canCreate = canEdit = canDelete = canExport = true;
        } else if (role.level === 3) { // General Manager
          canView = canCreate = canEdit = canDelete = canExport = true;
        } else if (role.level === 2) { // Administrative Manager
          canView = canCreate = canEdit = canExport = true;
        }
        // Employee (level 1) - no default permissions for media salaries

        await RolePermission.create({
          roleId: role._id,
          pageId: newPage._id,
          canView,
          canCreate,
          canEdit,
          canDelete,
          canExport
        });
      }
      console.log(`✅ Created permissions for page: ${pageData.name}`);
    }

    console.log('\n🎉 Media Salaries pages added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addPages();
