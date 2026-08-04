import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const fixPassword = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gemawi';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const User = (await import('../models/User')).default;

    const email = 'tamer@gmail.com';
    const newPassword = 'Gymmawy@123';

    const user = await User.findOne({ email });
    
    if (!user) {
      console.log('❌ User not found with email:', email);
      process.exit(1);
    }

    console.log('✅ User found:', user.name);
    
    // Update password
    user.password = newPassword;
    user.plainPassword = newPassword;
    await user.save();
    
    console.log('✅ Password updated successfully!');
    console.log('\n📧 Email:', email);
    console.log('🔑 Password:', newPassword);
    console.log('\n✅ You can now login with these credentials');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

fixPassword();
