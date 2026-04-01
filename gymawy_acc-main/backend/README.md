# 🚀 Gemawi Accounting System - Backend API

## 📋 نظرة عامة

Backend API احترافي كامل لنظام Gemawi المحاسبي باستخدام:
- **Node.js** + **Express** + **TypeScript**
- **MongoDB** + **Mongoose**
- **JWT Authentication**
- **Socket.io** للمحادثات الفورية
- **Multer** لرفع الملفات
- **Nodemailer** للإشعارات عبر البريد

---

## 🛠️ التثبيت والتشغيل

### 1. تثبيت المكتبات
```bash
cd backend
npm install
```

### 2. إعداد قاعدة البيانات
```bash
# تثبيت MongoDB
# Windows: قم بتحميل MongoDB من الموقع الرسمي
# أو استخدم MongoDB Atlas (Cloud)

# تشغيل MongoDB محلياً
mongod
```

### 3. إعداد ملف .env
```bash
cp .env.example .env
# ثم قم بتعديل القيم في ملف .env
```

### 4. تشغيل السيرفر
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

السيرفر سيعمل على: `http://localhost:5000`

---

## 📁 هيكل المشروع

```
backend/
├── src/
│   ├── config/
│   │   └── database.ts          # إعدادات قاعدة البيانات
│   ├── models/
│   │   ├── User.ts              # نموذج المستخدمين
│   │   ├── Company.ts           # نموذج الشركات
│   │   ├── Employee.ts          # نموذج الموظفين
│   │   ├── Department.ts        # نموذج الأقسام
│   │   ├── Payroll.ts           # نموذج الرواتب
│   │   ├── Revenue.ts           # نموذج الإيرادات
│   │   ├── Expense.ts           # نموذج المصروفات
│   │   ├── Task.ts              # نموذج المهام
│   │   ├── Message.ts           # نموذج الرسائل
│   │   ├── Post.ts              # نموذج المنشورات
│   │   ├── Notification.ts      # نموذج الإشعارات
│   │   ├── Review.ts            # نموذج التقييمات
│   │   ├── Custody.ts           # نموذج العهد
│   │   └── Attendance.ts        # نموذج الحضور
│   ├── routes/
│   │   ├── auth.routes.ts       # مسارات المصادقة
│   │   ├── company.routes.ts    # مسارات الشركات
│   │   ├── employee.routes.ts   # مسارات الموظفين
│   │   ├── department.routes.ts # مسارات الأقسام
│   │   ├── payroll.routes.ts    # مسارات الرواتب
│   │   ├── revenue.routes.ts    # مسارات الإيرادات
│   │   ├── expense.routes.ts    # مسارات المصروفات
│   │   ├── task.routes.ts       # مسارات المهام
│   │   ├── message.routes.ts    # مسارات الرسائل
│   │   ├── post.routes.ts       # مسارات المنشورات
│   │   ├── notification.routes.ts # مسارات الإشعارات
│   │   ├── review.routes.ts     # مسارات التقييمات
│   │   ├── custody.routes.ts    # مسارات العهد
│   │   └── attendance.routes.ts # مسارات الحضور
│   ├── controllers/
│   │   └── [نفس الملفات أعلاه].controller.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts   # التحقق من JWT
│   │   ├── role.middleware.ts   # التحقق من الصلاحيات
│   │   ├── validate.middleware.ts # التحقق من البيانات
│   │   └── upload.middleware.ts # رفع الملفات
│   ├── utils/
│   │   ├── jwt.util.ts          # وظائف JWT
│   │   ├── email.util.ts        # إرسال البريد
│   │   ├── pdf.util.ts          # توليد PDF
│   │   └── helpers.util.ts      # وظائف مساعدة
│   └── server.ts                # الملف الرئيسي
├── uploads/                     # مجلد الملفات المرفوعة
├── .env                         # المتغيرات البيئية
├── .env.example                 # مثال للمتغيرات
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🔐 API Endpoints

### Authentication
```
POST   /api/auth/register        # تسجيل مستخدم جديد
POST   /api/auth/login           # تسجيل الدخول
POST   /api/auth/logout          # تسجيل الخروج
GET    /api/auth/me              # الحصول على بيانات المستخدم الحالي
PUT    /api/auth/update-profile  # تحديث الملف الشخصي
PUT    /api/auth/change-password # تغيير كلمة المرور
```

### Companies (Super Admin Only)
```
GET    /api/companies            # قائمة الشركات
POST   /api/companies            # إضافة شركة
GET    /api/companies/:id        # تفاصيل شركة
PUT    /api/companies/:id        # تحديث شركة
DELETE /api/companies/:id        # حذف شركة
```

### Employees
```
GET    /api/employees            # قائمة الموظفين
POST   /api/employees            # إضافة موظف
GET    /api/employees/:id        # تفاصيل موظف
PUT    /api/employees/:id        # تحديث موظف
DELETE /api/employees/:id        # حذف موظف
```

### Departments
```
GET    /api/departments          # قائمة الأقسام
POST   /api/departments          # إضافة قسم
GET    /api/departments/:id      # تفاصيل قسم
PUT    /api/departments/:id      # تحديث قسم
DELETE /api/departments/:id      # حذف قسم
```

### Payroll
```
GET    /api/payroll              # قائمة الرواتب
POST   /api/payroll              # صرف راتب
GET    /api/payroll/:id          # تفاصيل راتب
PUT    /api/payroll/:id          # تحديث راتب
DELETE /api/payroll/:id          # حذف راتب
GET    /api/payroll/employee/:id # رواتب موظف محدد
```

### Revenues
```
GET    /api/revenues             # قائمة الإيرادات
POST   /api/revenues             # إضافة إيراد
GET    /api/revenues/:id         # تفاصيل إيراد
PUT    /api/revenues/:id         # تحديث إيراد
DELETE /api/revenues/:id         # حذف إيراد
GET    /api/revenues/stats       # إحصائيات الإيرادات
```

### Expenses
```
GET    /api/expenses             # قائمة المصروفات
POST   /api/expenses             # إضافة مصروف
GET    /api/expenses/:id         # تفاصيل مصروف
PUT    /api/expenses/:id         # تحديث مصروف
DELETE /api/expenses/:id         # حذف مصروف
GET    /api/expenses/stats       # إحصائيات المصروفات
```

### Tasks
```
GET    /api/tasks                # قائمة المهام
POST   /api/tasks                # إضافة مهمة
GET    /api/tasks/:id            # تفاصيل مهمة
PUT    /api/tasks/:id            # تحديث مهمة
DELETE /api/tasks/:id            # حذف مهمة
PUT    /api/tasks/:id/status     # تحديث حالة مهمة
```

### Messages
```
GET    /api/messages             # قائمة الرسائل
POST   /api/messages             # إرسال رسالة
GET    /api/messages/:id         # تفاصيل رسالة
DELETE /api/messages/:id         # حذف رسالة
GET    /api/messages/conversation/:userId # محادثة مع مستخدم
PUT    /api/messages/:id/read    # تعليم كمقروءة
```

### Posts
```
GET    /api/posts                # قائمة المنشورات
POST   /api/posts                # إضافة منشور
GET    /api/posts/:id            # تفاصيل منشور
PUT    /api/posts/:id            # تحديث منشور
DELETE /api/posts/:id            # حذف منشور
POST   /api/posts/:id/like       # إعجاب بمنشور
POST   /api/posts/:id/comment    # تعليق على منشور
```

### Notifications
```
GET    /api/notifications        # قائمة الإشعارات
GET    /api/notifications/:id    # تفاصيل إشعار
PUT    /api/notifications/:id/read # تعليم كمقروء
PUT    /api/notifications/read-all # تعليم الكل كمقروء
DELETE /api/notifications/:id    # حذف إشعار
```

### Reviews
```
GET    /api/reviews              # قائمة التقييمات
POST   /api/reviews              # إضافة تقييم
GET    /api/reviews/:id          # تفاصيل تقييم
PUT    /api/reviews/:id          # تحديث تقييم
DELETE /api/reviews/:id          # حذف تقييم
GET    /api/reviews/employee/:id # تقييمات موظف
```

### Custody
```
GET    /api/custody              # قائمة العهد
POST   /api/custody              # إضافة عهدة
GET    /api/custody/:id          # تفاصيل عهدة
PUT    /api/custody/:id          # تحديث عهدة
DELETE /api/custody/:id          # حذف عهدة
PUT    /api/custody/:id/return   # إرجاع عهدة
```

### Attendance
```
GET    /api/attendance           # قائمة الحضور
POST   /api/attendance           # تسجيل حضور
GET    /api/attendance/:id       # تفاصيل حضور
PUT    /api/attendance/:id       # تحديث حضور
DELETE /api/attendance/:id       # حذف حضور
GET    /api/attendance/employee/:id # حضور موظف
GET    /api/attendance/stats     # إحصائيات الحضور
```

---

## 🔒 المصادقة والأمان

### JWT Token
كل طلب يحتاج إلى Header:
```
Authorization: Bearer <your-jwt-token>
```

### الصلاحيات
- **super_admin**: الوصول الكامل لكل شيء
- **admin**: إدارة شركته فقط
- **employee**: الوصول المحدود حسب الصلاحيات

---

## 📊 Database Models

### User Schema
```typescript
{
  email: String (unique),
  password: String (hashed),
  name: String,
  role: 'super_admin' | 'admin' | 'employee',
  companyId: ObjectId (ref: Company),
  isActive: Boolean,
  permissions: Array,
  createdAt: Date,
  updatedAt: Date
}
```

### Company Schema
```typescript
{
  name: String,
  industry: String,
  address: String,
  phone: String,
  email: String,
  subscriptionPlan: String,
  subscriptionExpiry: Date,
  isActive: Boolean,
  generalManagerId: ObjectId,
  administrativeManagerId: ObjectId,
  createdAt: Date
}
```

### Employee Schema
```typescript
{
  userId: ObjectId (ref: User),
  companyId: ObjectId (ref: Company),
  departmentId: ObjectId (ref: Department),
  name: String,
  email: String,
  phone: String,
  position: String,
  salary: Number,
  salaryCurrency: 'EGP' | 'SAR' | 'USD',
  hireDate: Date,
  isGeneralManager: Boolean,
  isAdministrativeManager: Boolean,
  isActive: Boolean
}
```

---

## 🚀 WebSocket Events (Socket.io)

### Client → Server
```javascript
// الاتصال
socket.emit('join', { userId, companyId });

// إرسال رسالة
socket.emit('send-message', { 
  receiverId, 
  content 
});

// كتابة...
socket.emit('typing', { receiverId });
```

### Server → Client
```javascript
// رسالة جديدة
socket.on('new-message', (message) => {});

// إشعار جديد
socket.on('new-notification', (notification) => {});

// المستخدم يكتب
socket.on('user-typing', ({ userId }) => {});

// المستخدم متصل/غير متصل
socket.on('user-status', ({ userId, online }) => {});
```

---

## 📧 Email Notifications

يتم إرسال إشعارات بريدية عند:
- ✅ تسجيل مستخدم جديد
- ✅ صرف راتب
- ✅ تعيين مهمة جديدة
- ✅ تقييم جديد
- ✅ رسالة مهمة

---

## 📄 PDF Generation

يمكن توليد PDF لـ:
- قسائم الرواتب
- تقارير الإيرادات والمصروفات
- تقارير الحضور
- تقييمات الموظفين

---

## 🔧 Environment Variables

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/gemawi
JWT_SECRET=your-secret-key
JWT_EXPIRE=7d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-password
FRONTEND_URL=http://localhost:5173
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
```

---

## 🧪 Testing

```bash
# تشغيل الاختبارات
npm test

# اختبار API باستخدام Postman
# استيراد ملف: postman_collection.json
```

---

## 📦 Deployment

### Heroku
```bash
heroku create gemawi-backend
git push heroku main
heroku config:set MONGODB_URI=your-mongodb-uri
```

### Railway
```bash
railway login
railway init
railway up
```

### Render
1. ربط GitHub repo
2. إضافة Environment Variables
3. Deploy

---

## 🐛 Troubleshooting

### MongoDB Connection Error
```bash
# تأكد من تشغيل MongoDB
mongod

# أو استخدم MongoDB Atlas
```

### Port Already in Use
```bash
# غيّر PORT في ملف .env
PORT=5001
```

---

## 📝 Notes

- ✅ جميع كلمات المرور مشفرة باستخدام bcrypt
- ✅ جميع الطلبات محمية بـ JWT
- ✅ عزل كامل لبيانات الشركات (Multi-tenancy)
- ✅ Rate limiting لمنع الهجمات
- ✅ Input validation على جميع الطلبات
- ✅ Error handling شامل
- ✅ Logging لجميع العمليات

---

## 👨‍💻 المطور

**Gemawi Team**
- Email: Dexter11x2@gmail.com

---

## 📄 License

Proprietary - All Rights Reserved

---

