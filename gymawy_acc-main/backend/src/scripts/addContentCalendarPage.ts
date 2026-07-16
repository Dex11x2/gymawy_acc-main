import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Role from '../models/Role';
import Page from '../models/Page';
import RolePermission from '../models/RolePermission';

dotenv.config();

/**
 * Additively registers the "Content Calendar" module in the permissions system
 * WITHOUT wiping existing RolePermissions (unlike a full re-seed).
 *
 *   docker exec gemawi-backend npx ts-node src/scripts/addContentCalendarPage.ts
 */
async function addContentCalendarPage() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB');

    let page = await Page.findOne({ module: 'content_calendar' });
    if (page) {
      console.log('⚠️  Page already exists, refreshing role permissions only.');
    } else {
      page = await Page.create({
        name: 'تقويم المحتوى',
        nameEn: 'Content Calendar',
        path: '/content-calendar',
        icon: '🗓️',
        module: 'content_calendar',
      });
      console.log('✅ Page created:', page.name);
    }

    const roles = await Role.find();
    for (const role of roles) {
      let canView = false, canCreate = false, canEdit = false, canDelete = false, canExport = false;

      if (role.level === 4 || role.level === 3) {        // Dev & General Manager
        canView = canCreate = canEdit = canDelete = canExport = true;
      } else if (role.level === 2) {                      // Administrative Manager
        canView = canCreate = canEdit = true;
      } else if (role.level === 1) {                      // Employee
        canView = true;
      }

      await RolePermission.findOneAndUpdate(
        { roleId: role._id, pageId: page._id },
        { $set: { canView, canCreate, canEdit, canDelete, canExport } },
        { upsert: true },
      );
      console.log(`✅ Permissions set for: ${role.name}`);
    }

    console.log('\n🎉 Content Calendar page registered successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addContentCalendarPage();
