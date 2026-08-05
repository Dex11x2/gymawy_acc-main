import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import Employee from '../models/Employee';
import LeaveRequest from '../models/LeaveRequest';

/**
 * خصم أجازات شهر يوليو (اتاخدت فعليًا) من الرصيد الحالي + تسجيلها كسجل أثري.
 * آمن للتشغيل مرة واحدة (لو اتشغّل تاني بيتخطّى اللي اتسجّل).
 *
 * التشغيل داخل كونتينر الباك:
 *   docker exec gemawi-backend npx ts-node src/scripts/deductLeavesJuly.ts
 *
 * ملاحظة: يوم "الغياب" لعبدالرحمن صقر مش بيتخصم من رصيد الأجازات (الغياب أمر حضور/راتب منفصل).
 */
const items: Array<{ match: string; annual: number; emergency: number; note?: string }> = [
  { match: 'أحمد وحيد', annual: 0, emergency: 1 },
  { match: 'ياسمين رستم', annual: 4, emergency: 0 },
  { match: 'ندى محمد', annual: 1, emergency: 1 },
  { match: 'عبدالرحمن صقر', annual: 2, emergency: 1, note: 'يوم غياب إضافي (مش من الرصيد)' },
  { match: 'مريم الشامي', annual: 1, emergency: 1 },
  { match: 'داليا محمد خليل', annual: 1, emergency: 1 },
];

const TAG = 'تسجيل أجازات شهر يوليو';

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gemawi');
  console.log('✅ اتصلنا بقاعدة البيانات\n');

  const refDate = new Date();
  refDate.setMonth(refDate.getMonth() - 1); // الشهر اللي فات
  refDate.setDate(15);

  for (const it of items) {
    const emps = await Employee.find({ name: { $regex: it.match, $options: 'i' } });
    if (emps.length === 0) { console.log(`❌ مش لاقي موظف باسم: ${it.match}`); continue; }
    if (emps.length > 1) { console.log(`⚠️ أكتر من موظف لـ"${it.match}": ${emps.map((e) => e.name).join(' | ')} — اتخطّى (وضّح الاسم)`); continue; }

    const emp: any = emps[0];
    const already = await LeaveRequest.findOne({ employeeId: emp._id, reason: { $regex: TAG } });
    if (already) { console.log(`⏭️ ${emp.name}: اتسجّل قبل كده — تخطّي (مفيش خصم مكرر)`); continue; }

    const beforeA = emp.leaveBalance?.annual ?? 0;
    const beforeE = emp.leaveBalance?.emergency ?? 0;
    emp.leaveBalance.annual = Math.max(0, beforeA - it.annual);
    emp.leaveBalance.emergency = Math.max(0, beforeE - it.emergency);
    await emp.save();

    const recs: Array<{ type: string; days: number }> = [];
    if (it.annual > 0) recs.push({ type: 'annual', days: it.annual });
    if (it.emergency > 0) recs.push({ type: 'emergency', days: it.emergency });
    for (const r of recs) {
      await LeaveRequest.create({
        employeeId: emp._id,
        employeeName: emp.name,
        leaveType: r.type,
        startDate: refDate,
        endDate: refDate,
        days: r.days,
        reason: `${TAG} (تسجيل إداري)`,
        status: 'approved',
        reviewNotes: 'مُسجّلة إداريًا',
        companyId: emp.companyId,
      });
    }

    console.log(`✅ ${emp.name}: سنوي ${beforeA}→${emp.leaveBalance.annual} | عارضة ${beforeE}→${emp.leaveBalance.emergency}${it.note ? `  (${it.note})` : ''}`);
  }

  await mongoose.disconnect();
  console.log('\n🎯 خلص.');
};

run().catch((e) => { console.error('❌ خطأ:', e); process.exit(1); });
