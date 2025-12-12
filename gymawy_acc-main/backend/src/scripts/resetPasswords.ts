import mongoose from 'mongoose';
import User from '../models/User';
import dotenv from 'dotenv';

dotenv.config();

const resetPasswords = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('Connected to MongoDB');

    // Get all users
    const users = await User.find({});
    console.log(`Found ${users.length} users`);

    for (const user of users) {
      // If user has plainPassword, reset the password
      if (user.plainPassword) {
        console.log(`Resetting password for ${user.email}`);
        user.password = user.plainPassword;
        await user.save();
        console.log(`✅ Password reset for ${user.email} - Password: ${user.plainPassword}`);
      } else {
        console.log(`⚠️ No plainPassword found for ${user.email}`);
      }
    }

    console.log('✅ All passwords reset successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

resetPasswords();
