import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';
import Role from '../models/Role';

dotenv.config();

const ROLE_LEVEL_BY_ENUM: Record<string, number> = {
  dev: 4,
  general_manager: 3,
  administrative_manager: 2,
  admin: 2,
  employee: 1,
};

async function migrate(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI not set');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('✅ Connected\n');

  const roles = await Role.find().lean();
  if (roles.length === 0) {
    console.error('❌ No Role documents found. Run `npm run seed:permissions` first.');
    process.exit(1);
  }
  const roleByLevel = new Map<number, mongoose.Types.ObjectId>();
  for (const r of roles) roleByLevel.set(r.level, r._id as mongoose.Types.ObjectId);

  const users = await User.find().lean();
  console.log(`📊 Found ${users.length} user(s)\n`);

  let updated = 0;
  let normalisedRole = 0;

  for (const u of users as any[]) {
    let roleEnum: string = u.role;
    let roleNeedsNormalising = false;

    if (roleEnum === 'admin') {
      roleEnum = 'administrative_manager';
      roleNeedsNormalising = true;
    }

    const level = ROLE_LEVEL_BY_ENUM[roleEnum];
    if (!level) {
      console.warn(`  ⚠️  ${u.email}: unknown role "${u.role}", skipping`);
      continue;
    }

    const targetRoleId = roleByLevel.get(level);
    if (!targetRoleId) {
      console.warn(`  ⚠️  ${u.email}: no Role with level ${level}, skipping`);
      continue;
    }

    const set: any = { roleId: targetRoleId };
    if (roleNeedsNormalising) {
      set.role = roleEnum;
      normalisedRole++;
    }

    const result = await User.updateOne(
      { _id: u._id },
      {
        $set: set,
        $unset: { permissions: '' },
      }
    );

    if (result.modifiedCount > 0) {
      updated++;
      console.log(`  ✅ ${u.email.padEnd(40)} role=${roleEnum.padEnd(25)} roleId=${targetRoleId}`);
    }
  }

  console.log(`\n📦 Updated ${updated} user(s)`);
  if (normalisedRole > 0) console.log(`   (normalised role enum on ${normalisedRole} user(s))`);

  const sample = await User.findOne().lean() as any;
  console.log(`\n🔍 Sample user post-migration:`);
  console.log(`   email: ${sample?.email}`);
  console.log(`   role: ${sample?.role}`);
  console.log(`   roleId: ${sample?.roleId}`);
  console.log(`   permissions field present: ${'permissions' in sample}`);

  await mongoose.disconnect();
  console.log('\n🎉 Migration complete.');
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
