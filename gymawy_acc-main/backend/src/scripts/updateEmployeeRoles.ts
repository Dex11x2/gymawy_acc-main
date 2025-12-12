import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';
import Employee from '../models/Employee';

dotenv.config();

const updateEmployeeRoles = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB');

    const employees = await Employee.find();
    console.log(`\n📊 Found ${employees.length} employees\n`);

    for (const employee of employees) {
      if (!employee.userId) {
        console.log(`⚠️  Employee ${employee.name} has no userId, skipping...`);
        continue;
      }

      const user = await User.findById(employee.userId);
      if (!user) {
        console.log(`⚠️  User not found for employee ${employee.name}`);
        continue;
      }

      let newRole = 'employee';
      if (employee.isGeneralManager) {
        newRole = 'general_manager';
      } else if (employee.isAdministrativeManager) {
        newRole = 'administrative_manager';
      }

      if (user.role !== newRole) {
        user.role = newRole as any;
        await user.save();
        console.log(`✅ Updated ${employee.name}: ${user.email} → ${newRole}`);
      } else {
        console.log(`✓  ${employee.name}: ${user.email} already has correct role (${newRole})`);
      }
    }

    console.log('\n✅ All employee roles updated successfully!\n');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

updateEmployeeRoles();
