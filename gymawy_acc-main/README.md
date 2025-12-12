# 🏢 نظام Gymmawy لإدارة الشركات

## نظام محاسبي وإداري متكامل - Full Stack

### 📋 معلومات المشروع

- **الدومين:** https://gymmawy.net/
- **VPS IP:** 72.61.185.175
- **الباك اند:** Node.js + Express + MongoDB
- **الفرونت اند:** React + TypeScript + Tailwind CSS
- **قاعدة البيانات:** MongoDB Atlas

---

## 🚀 البدء السريع

### للمطورين الجدد:
👉 **اقرأ [GETTING_STARTED.md](GETTING_STARTED.md) لدليل شامل**

### التطوير المحلي
```bash
# 1. تثبيت المكتبات
npm install
cd backend && npm install && cd ..

# 2. تشغيل الباك اند
cd backend
npm run dev

# 3. تشغيل الفرونت اند (في terminal آخر)
npm run dev

# 4. افتح المتصفح
http://localhost:5173
```

### 🔐 بيانات الدخول
- البريد: `Dexter11x2@gmail.com`
- كلمة المرور: `Dex036211#`

---

## 📚 الوثائق

### للنشر على VPS:
- **[DOCKER_DEPLOY.md](DOCKER_DEPLOY.md)** - دليل النشر باستخدام Docker (موصى به) 🐳
- **[HOSTINGER_VPS_DEPLOY.md](HOSTINGER_VPS_DEPLOY.md)** - دليل النشر التقليدي
- **[PRE_DEPLOYMENT_CHECK.md](PRE_DEPLOYMENT_CHECK.md)** - فحص شامل قبل النشر

### للتطوير:
- **[backend/README.md](backend/README.md)** - وثائق الباك اند
- **[backend/INSTALLATION.md](backend/INSTALLATION.md)** - تثبيت الباك اند
- **[QUICK_GUIDE.md](QUICK_GUIDE.md)** - دليل سريع للمكونات الجديدة 🆕
- **[COMPONENTS_SUMMARY.md](COMPONENTS_SUMMARY.md)** - ملخص المكونات المحدثة 🆕
- **[APPLY_COMPONENTS.md](APPLY_COMPONENTS.md)** - قائمة الصفحات المحدثة 🆕

---

## 🎯 الميزات الرئيسية

### 💰 المحاسبة والمالية
- إدارة الإيرادات والمصروفات
- حساب الرواتب التلقائي
- دعم عملات متعددة
- تقارير مالية شاملة

### 👥 الموارد البشرية
- إدارة الموظفين والأقسام
- الحضور والانصراف
- العهد والسلفيات
- تقييم الأداء

### 💬 التواصل الداخلي
- المحادثات الفورية
- المنشورات والإعلانات
- إدارة المهام
- الإشعارات

### 🔒 الأمان والصلاحيات
- نظام صلاحيات متقدم (Super Admin, Admin, Employee)
- JWT Authentication
- تشفير البيانات
- فصل بيانات الشركات

---

## 🛠️ التقنيات المستخدمة

### Backend
- Node.js + Express
- TypeScript
- MongoDB + Mongoose
- Socket.io
- JWT + bcrypt
- Helmet + CORS

### Frontend
- React 18
- TypeScript
- Zustand (State Management)
- React Router
- Tailwind CSS
- Axios
- **مكونات UI مخصصة** (Modal, ConfirmDialog, Toast) 🆕

---

## 📦 البنية

```
gemawi-pro-accounting-system/
├── backend/                 # Backend API
│   ├── src/
│   │   ├── models/         # 17 Models
│   │   ├── controllers/    # 16 Controllers
│   │   ├── routes/         # 17 Routes
│   │   ├── middleware/     # Auth & Validation
│   │   ├── config/         # Database Config
│   │   └── server.ts       # Main Server
│   ├── .env.production     # Production Config
│   └── package.json
├── src/                    # Frontend
│   ├── components/         # 11 Components (Modal, ConfirmDialog, Toast) 🆕
│   ├── pages/             # 24 Pages (13 محدثة بالمكونات الجديدة) 🆕
│   ├── store/             # 4 Stores
│   ├── services/          # API Service
│   └── types/             # TypeScript Types
├── .env.production        # Frontend Production Config
├── nginx-backend.conf     # Nginx Config for Backend
├── nginx-frontend.conf    # Nginx Config for Frontend
└── README.md
```

---

## 🚀 النشر على VPS

### الخطوات السريعة:

1. **إعداد MongoDB Atlas**
   ```bash
   https://www.mongodb.com/cloud/atlas/register
   ```

2. **الاتصال بالـ VPS**
   ```bash
   ssh root@72.61.185.175
   ```

3. **تثبيت المتطلبات**
   ```bash
   apt update && apt upgrade -y
   curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
   apt install -y nodejs nginx
   npm install -g pm2
   ```

4. **رفع الملفات**
   - Backend → `/var/www/gemawi/backend`
   - Frontend (dist) → `/var/www/gemawi/frontend`

5. **تشغيل الباك اند**
   ```bash
   cd /var/www/gemawi/backend
   npm install
   npm run build
   pm2 start dist/server.js --name gemawi-backend
   pm2 startup && pm2 save
   ```

6. **إعداد Nginx**
   ```bash
   cp nginx-backend.conf /etc/nginx/sites-available/gemawi-backend
   cp nginx-frontend.conf /etc/nginx/sites-available/gemawi-frontend
   ln -s /etc/nginx/sites-available/gemawi-backend /etc/nginx/sites-enabled/
   ln -s /etc/nginx/sites-available/gemawi-frontend /etc/nginx/sites-enabled/
   nginx -t && systemctl restart nginx
   ```

7. **تثبيت SSL**
   ```bash
   apt install -y certbot python3-certbot-nginx
   certbot --nginx -d gymmawy.net -d www.gymmawy.net
   ```

**للتفاصيل الكاملة:** راجع [HOSTINGER_VPS_DEPLOY.md](HOSTINGER_VPS_DEPLOY.md)

---

## 📊 API Endpoints

```
✅ /api/auth              - Authentication
✅ /api/companies         - Company management
✅ /api/employees         - Employee management
✅ /api/departments       - Department management
✅ /api/payroll           - Payroll management
✅ /api/revenues          - Revenue tracking
✅ /api/expenses          - Expense tracking
✅ /api/tasks             - Task management
✅ /api/messages          - Messaging system
✅ /api/posts             - Posts/Announcements
✅ /api/notifications     - Notifications
✅ /api/reviews           - Employee reviews
✅ /api/custody           - Custody management
✅ /api/attendance        - Attendance tracking
✅ /api/advances          - Advance payments
✅ /api/registration-requests - Registration
✅ /health                - Health check
```

---

## 🧪 الاختبار

### Backend
```bash
curl http://72.61.185.175:5000/health
```

### Frontend
```bash
https://gymmawy.net/
```

---

## 📝 Scripts

### Frontend
```bash
npm run dev      # Development server
npm run build    # Production build
npm run preview  # Preview production build
```

### Backend
```bash
npm run dev      # Development with nodemon
npm run build    # Build TypeScript
npm run start    # Start production server
```

---

## 🔧 Environment Variables

### Frontend (.env.production)
```env
VITE_API_URL=http://72.61.185.175:5000/api
VITE_SOCKET_URL=http://72.61.185.175:5000
VITE_APP_NAME=Gymmawy
VITE_APP_VERSION=1.0.0
```

### Backend (backend/.env)
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/gemawi
JWT_SECRET=your-secret-key
JWT_EXPIRE=30d
FRONTEND_URL=https://gymmawy.net
CORS_ORIGIN=https://gymmawy.net
```

---

## 📞 الدعم

**للمساعدة:** Dexter11x2@gmail.com

---

## 🎨 المكونات الجديدة (v2.0) 🆕

تم تحديث النظام بمكونات UI حديثة واحترافية:

### 1. Modal Component
- نوافذ منبثقة عصرية
- 5 أحجام مختلفة (sm, md, lg, xl, full)
- إغلاق بالضغط خارج النافذة أو ESC
- Focus management تلقائي

### 2. ConfirmDialog Component
- نوافذ تأكيد للعمليات الحساسة
- 3 أنواع (danger, warning, info)
- تصميم واضح ومميز

### 3. Toast Component
- إشعارات منبثقة احترافية
- 4 أنواع (success, error, warning, info)
- إغلاق تلقائي بعد 5 ثواني
- أيقونات ملونة مميزة

### الصفحات المحدثة (13 صفحة):
✅ Employees | ✅ Departments | ✅ Revenues | ✅ Expenses | ✅ Payroll  
✅ Tasks | ✅ Posts | ✅ Custody | ✅ Advances | ✅ Attendance  
✅ EmployeeReviews | ✅ Profile | ✅ Reports

**للمزيد:** راجع [QUICK_GUIDE.md](QUICK_GUIDE.md) و [COMPONENTS_SUMMARY.md](COMPONENTS_SUMMARY.md)

---

## 📄 الترخيص

هذا المشروع مملوك بالكامل ومحمي بحقوق الملكية الفكرية.

---

**🚀 نظام Gymmawy v2.0 - إدارة احترافية لشركتك**
