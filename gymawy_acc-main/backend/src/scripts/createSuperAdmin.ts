import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const createSuperAdmin = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gemawi';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const UserSchema = new mongoose.Schema({
      name: String,
      email: String,
      phone: String,
      password: String,
      role: String,
      companyId: mongoose.Schema.Types.ObjectId,
      isActive: Boolean,
      createdAt: Date,
      updatedAt: Date
    });

    const User = mongoose.models.User || mongoose.model('User', UserSchema);

    const existingSuperAdmin = await User.findOne({ email: 'Dexter11x2@gmail.com' });
    
    if (existingSuperAdmin) {
      console.log('✅ Super Admin already exists');
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash('Dex036211#', 10);
    
    await User.create({
      name: 'Super Admin',
      email: 'Dexter11x2@gmail.com',
      phone: '+201234567890',
      password: hashedPassword,
      role: 'super_admin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('✅ Super Admin created');
    console.log('📧 Email: Dexter11x2@gmail.com');
    console.log('🔑 Password: Dex036211#');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

createSuperAdmin();
