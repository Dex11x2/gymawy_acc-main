# دليل تكامل نظام الإشعارات

## نظرة عامة
تم إنشاء نظام إشعارات شامل في `backend/src/services/notification.service.ts` يوفر دوال جاهزة لإرسال إشعارات للمستخدمين بناءً على الأحداث المختلفة.

## الدوال المتاحة

### 1. إنشاء إشعار عام
```typescript
import { createNotification } from '../services/notification.service';

await createNotification({
  userId: 'user_id' or ['user_id1', 'user_id2'], // مستخدم واحد أو عدة مستخدمين
  title: 'عنوان الإشعار',
  message: 'نص الإشعار',
  type: 'message' | 'task' | 'payment' | 'attendance' | 'complaint' | 'review' | 'post' | 'general',
  link: '/path/to/page', // اختياري
  senderId: 'sender_id', // اختياري
  senderName: 'اسم المرسل', // اختياري
  companyId: 'company_id' // اختياري
}, io); // io اختياري للـ Socket.IO
```

### 2. إشعار لمستخدمين بصلاحية معينة
```typescript
import { notifyUsersByPermission } from '../services/notification.service';

await notifyUsersByPermission('employees', {
  title: 'موظف جديد',
  message: 'تم إضافة موظف جديد',
  type: 'general',
  link: '/employees'
}, io);
```

### 3. إشعار للمدراء فقط
```typescript
import { notifyManagers } from '../services/notification.service';

await notifyManagers({
  title: 'تنبيه مهم',
  message: 'يتطلب انتباهك',
  type: 'general',
  link: '/dashboard',
  companyId: companyId
}, io);
```

## أمثلة التكامل في Controllers

### مثال 1: Message Controller
```typescript
import { notifyNewMessage } from '../services/notification.service';

export const sendMessage = async (req: any, res: Response) => {
  const { recipientId, content } = req.body;
  const sender = await User.findById(req.user._id);

  // ... حفظ الرسالة في قاعدة البيانات

  const io = req.app.get('io');
  await notifyNewMessage(
    recipientId,
    sender._id.toString(),
    sender.name,
    content.substring(0, 50), // أول 50 حرف
    io
  );

  res.json({ success: true });
};
```

### مثال 2: Payroll Controller
```typescript
import { notifyPayrollPayment } from '../services/notification.service';

export const payEmployee = async (req: any, res: Response) => {
  const { employeeId, amount, month } = req.body;

  // ... معالجة الدفع

  const io = req.app.get('io');
  await notifyPayrollPayment(employeeId, amount, month, io);

  res.json({ success: true });
};
```

### مثال 3: Complaint Controller
```typescript
import { notifyNewComplaint } from '../services/notification.service';

export const createComplaint = async (req: any, res: Response) => {
  const complaint = await Complaint.create(req.body);
  const user = await User.findById(req.user._id);

  const io = req.app.get('io');
  await notifyNewComplaint(
    complaint.title,
    user.name,
    user.companyId.toString(),
    io
  );

  res.status(201).json(complaint);
};
```

### مثال 4: Attendance Controller
```typescript
import { notifyAttendanceIssue } from '../services/notification.service';

export const markAbsent = async (req: any, res: Response) => {
  const { employeeId, date } = req.body;

  // ... تسجيل الغياب

  const io = req.app.get('io');
  await notifyAttendanceIssue(
    employeeId,
    `تم تسجيل غياب في تاريخ ${date}`,
    io
  );

  res.json({ success: true });
};
```

### مثال 5: Review Controller
```typescript
import { notifyNewReview } from '../services/notification.service';

export const createReview = async (req: any, res: Response) => {
  const { employeeId, rating, comment } = req.body;
  const reviewer = await User.findById(req.user._id);

  // ... حفظ التقييم

  const io = req.app.get('io');
  await notifyNewReview(
    employeeId,
    reviewer.name,
    rating,
    io
  );

  res.status(201).json({ success: true });
};
```

### مثال 6: Post Controller
```typescript
import { notifyNewPost } from '../services/notification.service';

export const createPost = async (req: any, res: Response) => {
  const post = await Post.create(req.body);
  const author = await User.findById(req.user._id);

  const io = req.app.get('io');
  await notifyNewPost(
    post.title,
    author.name,
    author.companyId.toString(),
    io
  );

  res.status(201).json(post);
};
```

## الحصول على Socket.IO في Controller
```typescript
const io = req.app.get('io');
```

## أنواع الإشعارات المتاحة
- `message`: رسائل الدردشة
- `task`: المهام
- `payment`: الرواتب والمدفوعات
- `attendance`: الحضور والغياب
- `complaint`: الشكاوى
- `review`: التقييمات
- `post`: المنشورات
- `general`: عام

## ملاحظات مهمة
1. **Socket.IO اختياري**: إذا لم يكن متاحاً، سيتم حفظ الإشعار في قاعدة البيانات فقط
2. **الصلاحيات**: `notifyUsersByPermission` تُرسل فقط للمستخدمين الذين لديهم صلاحية `read` أو `view`
3. **المدراء**: `notifyManagers` تُرسل لـ `super_admin`, `general_manager`, `administrative_manager`
4. **عدة مستخدمين**: يمكن إرسال إشعار لعدة مستخدمين بتمرير array من IDs

## خطوات التكامل

### 1. استيراد الدالة المناسبة
```typescript
import { notifyNewTask, notifyNewMessage } from '../services/notification.service';
```

### 2. استدعاء الدالة بعد الحدث
```typescript
const io = req.app.get('io');
await notifyNewTask(userId, taskTitle, assignerName, assignerId, io);
```

### 3. التعامل مع الأخطاء (اختياري)
```typescript
try {
  await notifyNewTask(...);
} catch (error) {
  console.error('خطأ في إرسال الإشعار:', error);
  // الإشعار فشل لكن العملية الأساسية نجحت
}
```

## Controllers التي تحتاج تكامل

- ✅ `task.controller.ts` - مُفعّل
- ⏳ `message.controller.ts` - يحتاج تفعيل
- ⏳ `payroll.controller.ts` - يحتاج تفعيل
- ⏳ `complaint.controller.ts` - يحتاج تفعيل
- ⏳ `review.controller.ts` - يحتاج تفعيل
- ⏳ `post.controller.ts` - يحتاج تفعيل
- ⏳ `attendance.controller.ts` - يحتاج تفعيل

## الفوائد

1. ✅ **كود نظيف**: دالة واحدة بدلاً من تكرار كود الإشعارات
2. ✅ **موحد**: نفس الشكل والسلوك في كل مكان
3. ✅ **قابل للصيانة**: تحديث في مكان واحد يؤثر على الكل
4. ✅ **مرن**: دعم Socket.IO اختياري
5. ✅ **ذكي**: إرسال حسب الصلاحيات تلقائياً
6. ✅ **سهل الاستخدام**: دوال واضحة ومباشرة
