import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Role from '../models/Role';
import Page from '../models/Page';
import RolePermission from '../models/RolePermission';

dotenv.config();

async function addAdsFundingPage() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB');

    // Check if page already exists
    const existingPage = await Page.findOne({ module: 'ads_funding' });
    if (existingPage) {
      console.log('⚠️  Page already exists!');
      process.exit(0);
    }

    // Create new page
    const newPage = await Page.create({
      name: 'تقرير عمليات تمويل الإعلانات',
      nameEn: 'Ads Funding Report',
      path: '/ads-funding-report',
      icon: '📱',
      module: 'ads_funding'
    });
    console.log('✅ Page created:', newPage.name);

    // Get all roles
    const roles = await Role.find();

    // Create permissions for each role
    for (const role of roles) {
      let canView = false, canCreate = false, canEdit = false, canDelete = false, canExport = false;

      if (role.level === 4 || role.level === 3) { // Super Admin & General Manager
        canView = canCreate = canEdit = canDelete = canExport = true;
      } else if (role.level === 2) { // Administrative Manager
        canView = canCreate = canEdit = canExport = true;
      } else if (role.level === 1) { // Employee
        canView = true;
      }

      await RolePermission.create({
        roleId: role._id,
        pageId: newPage._id,
        canView,
        canCreate,
        canEdit,
        canDelete,
        canExport
      });

      console.log(`✅ Permissions created for: ${role.name}`);
    }

    console.log('\n🎉 Ads Funding page added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addAdsFundingPage();
