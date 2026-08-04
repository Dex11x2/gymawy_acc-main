import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Diagnose + recover admin login.
 *
 *   - Always prints every user (email / name / role / isActive) so you can see
 *     which admin account actually exists in this database.
 *   - If RESET=1 is set, it also resets the password for the account whose
 *     email matches EMAIL (case-insensitive) to NEW_PASSWORD, and reactivates
 *     it. The User model's pre-save hook hashes the password automatically.
 *
 * Usage (inside the running backend container, which already has MONGODB_URI):
 *
 *   # 1) Just list accounts:
 *   docker exec gemawi-backend npx ts-node src/scripts/resetAdmin.ts
 *
 *   # 2) Reset a specific account's password:
 *   docker exec \
 *     -e RESET=1 \
 *     -e EMAIL='Dexter11x2@gmail.com' \
 *     -e NEW_PASSWORD='Dex036211#' \
 *     gemawi-backend npx ts-node src/scripts/resetAdmin.ts
 */
const run = async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gemawi';
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB\n');

  const User = (await import('../models/User')).default;

  const users = await User.find({}).select('email name role isActive').lean();
  console.log(`👥 ${users.length} user(s) in this database:`);
  for (const u of users as any[]) {
    console.log(
      `   - ${u.email}  |  ${u.name}  |  role=${u.role}  |  active=${u.isActive}`
    );
  }
  console.log('');

  if (process.env.RESET === '1') {
    const email = process.env.EMAIL;
    const newPassword = process.env.NEW_PASSWORD;
    if (!email || !newPassword) {
      console.log('❌ RESET=1 requires EMAIL and NEW_PASSWORD env vars.');
      await mongoose.disconnect();
      process.exit(1);
    }

    const user = await User.findOne({
      email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });

    if (!user) {
      console.log(`❌ No user found with email: ${email}`);
      console.log('   Pick one of the emails listed above and set EMAIL to it.');
      await mongoose.disconnect();
      process.exit(1);
    }

    user.password = newPassword; // pre-save hook hashes it
    user.plainPassword = newPassword;
    user.isActive = true;
    await user.save();

    console.log('✅ Password reset + account reactivated');
    console.log(`   📧 Email:    ${user.email}`);
    console.log(`   🔑 Password: ${newPassword}`);
    console.log(`   🧩 Role:     ${user.role}`);
  } else {
    console.log('ℹ️  Read-only run. To reset a password, re-run with:');
    console.log("     -e RESET=1 -e EMAIL='<email>' -e NEW_PASSWORD='<password>'");
  }

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
