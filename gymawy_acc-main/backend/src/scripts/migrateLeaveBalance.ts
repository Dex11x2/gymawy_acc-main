import Employee from '../models/Employee';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function migrateLeaveBalance() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gemawi-accounting';
    await mongoose.connect(mongoUri);
    
    console.log('✅ Connected to MongoDB');
    console.log('🔄 بدء ترحيل أرصدة الإجازات...\n');
    
    // تحديث جميع الموظفين الذين لديهم رصيد 14 إلى 21
    const result = await Employee.updateMany(
      { 'leaveBalance.annual': 14 },
      { $set: { 'leaveBalance.annual': 21 } }
    );
    
    console.log(`✅ تم تحديث ${result.modifiedCount} موظف من 14 إلى 21 يوم`);
    
    // التحقق من الموظفين الذين ليس لديهم رصيد
    const employeesWithoutBalance = await Employee.find({
      $or: [
        { leaveBalance: { $exists: false } },
        { 'leaveBalance.annual': { $exists: false } }
      ]
    });
    
    let addedCount = 0;
    for (const employee of employeesWithoutBalance) {
      employee.leaveBalance = { annual: 21, emergency: 7 };
      await employee.save();
      addedCount++;
    }
    
    console.log(`✅ تم إضافة رصيد لـ ${addedCount} موظف`);
    
    // عرض إحصائيات نهائية
    const totalEmployees = await Employee.countDocuments();
    const employeesWithCorrectBalance = await Employee.countDocuments({ 'leaveBalance.annual': 21 });
    
    console.log('\n📊 الإحصائيات النهائية:');
    console.log(`   إجمالي الموظفين: ${totalEmployees}`);
    console.log(`   الموظفين برصيد 21 يوم: ${employeesWithCorrectBalance}`);
    console.log(`   نسبة النجاح: ${((employeesWithCorrectBalance / totalEmployees) * 100).toFixed(1)}%`);
    
    console.log('\n✅ اكتمل الترحيل بنجاح');
    
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ خطأ في الترحيل:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

migrateLeaveBalance();
