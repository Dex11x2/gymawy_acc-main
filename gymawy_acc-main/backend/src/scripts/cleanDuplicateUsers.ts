import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const cleanDuplicateUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('✅ Connected to MongoDB');

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

    // حذف Super Admin القديم (الذي ليس Developer)
    const oldSuperAdmin: any = await User.findOne({ 
      email: { $regex: /dexter11x2@gmail.com/i },
      name: { $ne: 'Developer' }
    });
    
    if (oldSuperAdmin) {
      await User.deleteOne({ _id: oldSuperAdmin._id });
      console.log('✅ Deleted old Super Admin:', oldSuperAdmin.name);
    }

    // حذف حسابات حسام المكررة (نبقي واحد فقط)
    const hossamAccounts: any[] = await User.find({ 
      name: { $regex: /حسام|hossam/i }
    }).sort({ createdAt: 1 });

    console.log(`Found ${hossamAccounts.length} hossam accounts`);

    // نبقي الأول ونحذف الباقي
    for (let i = 1; i < hossamAccounts.length; i++) {
      await User.deleteOne({ _id: hossamAccounts[i]._id });
      console.log(`✅ Deleted duplicate hossam account: ${hossamAccounts[i].email}`);
    }

    console.log('✅ Cleanup completed!');
    
    // عرض المستخدمين المتبقين
    const remainingUsers: any[] = await User.find({});
    console.log('\n📋 Remaining users:');
    remainingUsers.forEach((u: any) => {
      console.log(`- ${u.name} (${u.email}) - ${u.role}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

cleanDuplicateUsers();
