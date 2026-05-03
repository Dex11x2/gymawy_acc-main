import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const createTestUser = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gemawi';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const User = (await import('../models/User')).default;

    const email = 'test@test.com';
    const password = '123456';

    const existingUser = await User.findOne({ email });
    
    if (existingUser) {
      console.log('⚠️ User already exists, updating password...');
      existingUser.password = password;
      existingUser.plainPassword = password;
      await existingUser.save();
      console.log('✅ Password updated');
    } else {
      await User.create({
        name: 'Test User',
        email: email,
        phone: '01234567890',
        password: password,
        plainPassword: password,
        role: 'dev',
        isActive: true
      });
      console.log('✅ Test user created');
    }

    console.log('\n📧 Email:', email);
    console.log('🔑 Password:', password);
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

createTestUser();
