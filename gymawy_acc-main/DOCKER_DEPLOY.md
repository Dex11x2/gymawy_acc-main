# 🐳 دليل النشر باستخدام Docker

## 📋 معلومات النشر

- **الدومين:** https://gymmawy.net/
- **VPS IP:** 72.61.185.175
- **التقنية:** Docker + Docker Compose
- **قاعدة البيانات:** MongoDB Atlas

---

## 🎯 البنية

```
Docker Containers:
├── gemawi-frontend (Nginx + React)
│   ├── Port 80 (HTTP)
│   ├── Port 443 (HTTPS)
│   └── Proxy → Backend
└── gemawi-backend (Node.js)
    └── Port 5000 (Internal)

MongoDB Atlas (Cloud)
```

---

## 🚀 خطوات النشر (15 دقيقة)

### 1️⃣ إعداد MongoDB Atlas (5 دقائق)

```bash
# 1. اذهب إلى: https://www.mongodb.com/cloud/atlas/register
# 2. سجل حساب مجاني
# 3. اختر Free Tier (M0)
# 4. Region: Europe - Frankfurt
# 5. اسم Cluster: gemawi-cluster
# 6. أنشئ Database User:
#    Username: gemawi_admin
#    Password: (احفظها - مثال: Gym@2024Strong!)
# 7. Network Access: 0.0.0.0/0
# 8. احصل على Connection String
```

**Connection String:**
```
mongodb+srv://gemawi_admin:YOUR_PASSWORD@cluster.mongodb.net/gemawi?retryWrites=true&w=majority
```

---

### 2️⃣ الاتصال بالـ VPS

```bash
ssh root@72.61.185.175
```

---

### 3️⃣ تثبيت Docker و Docker Compose

```bash
# تحديث النظام
apt update && apt upgrade -y

# تثبيت Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# تثبيت Docker Compose
apt install -y docker-compose

# التحقق
docker --version
docker-compose --version

# تشغيل Docker
systemctl start docker
systemctl enable docker
```

---

### 4️⃣ رفع المشروع على VPS

```bash
# إنشاء مجلد
mkdir -p /var/www/gemawi
cd /var/www/gemawi

# رفع الملفات (استخدم FileZilla أو SCP أو Git)
# يجب رفع:
# - Dockerfile.backend
# - Dockerfile.frontend
# - docker-compose.yml
# - nginx.conf
# - .dockerignore
# - .env.docker
# - backend/ (كامل)
# - src/ (كامل)
# - public/ (كامل)
# - package.json
# - tsconfig.json
# - vite.config.ts
# - tailwind.config.js
# - postcss.config.js
# - index.html
# - index.tsx
# - index.css
```

---

### 5️⃣ إعداد Environment Variables

```bash
cd /var/www/gemawi

# تحرير ملف .env.docker
nano .env.docker
```

**محتوى .env.docker:**
```env
MONGODB_URI=mongodb+srv://gemawi_admin:YOUR_PASSWORD@cluster.mongodb.net/gemawi?retryWrites=true&w=majority
JWT_SECRET=change-this-to-random-32-character-secret-key
```

```bash
# حفظ: Ctrl+X ثم Y ثم Enter
```

---

### 6️⃣ بناء وتشغيل Docker Containers

```bash
cd /var/www/gemawi

# بناء الـ Images
docker-compose build

# تشغيل الـ Containers
docker-compose up -d

# التحقق من الحالة
docker-compose ps

# عرض اللوجات
docker-compose logs -f
```

---

### 7️⃣ إعداد DNS

```bash
# في لوحة تحكم Hostinger:
# 1. اذهب إلى DNS/Nameservers
# 2. أضف A Record:
#    Type: A
#    Name: @
#    Points to: 72.61.185.175
#    TTL: 14400
# 3. أضف A Record للـ www:
#    Type: A
#    Name: www
#    Points to: 72.61.185.175
#    TTL: 14400
```

---

### 8️⃣ تثبيت SSL (HTTPS)

```bash
# تثبيت Certbot
apt install -y certbot

# إيقاف الـ Frontend Container مؤقتاً
docker-compose stop frontend

# الحصول على شهادة SSL
certbot certonly --standalone -d gymmawy.net -d www.gymmawy.net

# الشهادات ستكون في:
# /etc/letsencrypt/live/gymmawy.net/fullchain.pem
# /etc/letsencrypt/live/gymmawy.net/privkey.pem

# إنشاء مجلد SSL
mkdir -p /var/www/gemawi/ssl

# نسخ الشهادات
cp /etc/letsencrypt/live/gymmawy.net/fullchain.pem /var/www/gemawi/ssl/
cp /etc/letsencrypt/live/gymmawy.net/privkey.pem /var/www/gemawi/ssl/

# تحديث nginx.conf لإضافة SSL
nano /var/www/gemawi/nginx.conf
```

**إضافة SSL في nginx.conf:**
```nginx
server {
    listen 80;
    server_name gymmawy.net www.gymmawy.net;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name gymmawy.net www.gymmawy.net;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    root /usr/share/nginx/html;
    index index.html;

    # ... باقي الإعدادات
}
```

```bash
# إعادة بناء وتشغيل Frontend
docker-compose up -d --build frontend
```

---

### 9️⃣ فتح البورتات

```bash
# تفعيل Firewall
ufw enable

# فتح البورتات
ufw allow 22      # SSH
ufw allow 80      # HTTP
ufw allow 443     # HTTPS

# التحقق
ufw status
```

---

## 🧪 اختبار النظام

### 1. اختبار الباك اند
```bash
# من داخل VPS
curl http://localhost:5000/health

# يجب أن يرجع:
{"status":"success","message":"✅ Gemawi Backend API is running!"}
```

### 2. اختبار الفرونت اند
```bash
# افتح المتصفح
http://gymmawy.net/

# بعد SSL:
https://gymmawy.net/

# يجب أن تظهر صفحة تسجيل الدخول
```

### 3. اختبار الاتصال الكامل
```bash
# سجل دخول بالبيانات:
# البريد: Dexter11x2@gmail.com
# كلمة المرور: Dex036211#

# تحقق من:
# - API Requests تعمل
# - البيانات تُحفظ في MongoDB
# - لا توجد أخطاء في Console
```

---

## 📊 أوامر Docker المهمة

### إدارة Containers
```bash
# عرض الحالة
docker-compose ps

# عرض اللوجات
docker-compose logs -f

# عرض لوجات خدمة معينة
docker-compose logs -f backend
docker-compose logs -f frontend

# إعادة تشغيل
docker-compose restart

# إعادة تشغيل خدمة معينة
docker-compose restart backend
docker-compose restart frontend

# إيقاف
docker-compose stop

# إيقاف وحذف
docker-compose down

# إيقاف وحذف مع الـ Volumes
docker-compose down -v
```

### بناء وتحديث
```bash
# إعادة بناء
docker-compose build

# إعادة بناء بدون Cache
docker-compose build --no-cache

# بناء وتشغيل
docker-compose up -d --build

# تحديث خدمة معينة
docker-compose up -d --build backend
docker-compose up -d --build frontend
```

### تنظيف النظام
```bash
# حذف Images غير المستخدمة
docker image prune -a

# حذف Containers المتوقفة
docker container prune

# حذف كل شيء غير مستخدم
docker system prune -a
```

---

## 🔄 تحديث النظام

### تحديث الباك اند
```bash
cd /var/www/gemawi

# رفع الملفات الجديدة في backend/

# إعادة بناء وتشغيل
docker-compose up -d --build backend

# التحقق
docker-compose logs -f backend
```

### تحديث الفرونت اند
```bash
cd /var/www/gemawi

# رفع الملفات الجديدة في src/

# إعادة بناء وتشغيل
docker-compose up -d --build frontend

# التحقق
docker-compose logs -f frontend
```

---

## 🔍 استكشاف الأخطاء

### 1. Container لا يعمل
```bash
# عرض الحالة
docker-compose ps

# عرض اللوجات
docker-compose logs backend
docker-compose logs frontend

# الدخول إلى Container
docker exec -it gemawi-backend sh
docker exec -it gemawi-frontend sh
```

### 2. MongoDB Connection Error
```bash
# تحقق من Connection String في .env.docker
cat .env.docker

# تحقق من Network Access في MongoDB Atlas
# يجب أن يكون 0.0.0.0/0 مسموح

# إعادة تشغيل Backend
docker-compose restart backend
```

### 3. Frontend لا يتصل بالـ Backend
```bash
# تحقق من nginx.conf
cat nginx.conf

# تحقق من الـ Network
docker network ls
docker network inspect gemawi_gemawi-network

# إعادة بناء Frontend
docker-compose up -d --build frontend
```

### 4. SSL لا يعمل
```bash
# تحقق من الشهادات
ls -la /var/www/gemawi/ssl/

# تحقق من nginx.conf
cat nginx.conf

# إعادة تشغيل Frontend
docker-compose restart frontend
```

---

## 📝 Checklist النشر

### قبل البناء ✅
- [ ] MongoDB Atlas جاهز
- [ ] Connection String محفوظ
- [ ] .env.docker محدث
- [ ] JWT_SECRET تم تغييره
- [ ] جميع الملفات مرفوعة

### بعد البناء ✅
- [ ] Docker مثبت
- [ ] Docker Compose مثبت
- [ ] Images تم بناؤها
- [ ] Containers تعمل
- [ ] Backend يستجيب
- [ ] Frontend يفتح

### DNS و SSL ✅
- [ ] DNS Records محدثة
- [ ] A Record يشير إلى 72.61.185.175
- [ ] SSL مثبت
- [ ] HTTPS يعمل

---

## 🎯 الملفات المطلوبة

```
/var/www/gemawi/
├── Dockerfile.backend
├── Dockerfile.frontend
├── docker-compose.yml
├── nginx.conf
├── .dockerignore
├── .env.docker
├── .env.production
├── backend/
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── src/
├── public/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── index.tsx
└── index.css
```

---

## 🚀 التشغيل التلقائي عند إعادة تشغيل VPS

```bash
# Docker Compose يعمل تلقائياً بسبب restart: always
# لكن للتأكد:

# إنشاء systemd service
nano /etc/systemd/system/gemawi.service
```

**محتوى gemawi.service:**
```ini
[Unit]
Description=Gemawi Docker Compose
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/var/www/gemawi
ExecStart=/usr/bin/docker-compose up -d
ExecStop=/usr/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

```bash
# تفعيل الخدمة
systemctl enable gemawi.service
systemctl start gemawi.service

# التحقق
systemctl status gemawi.service
```

---

## 📞 الدعم

**للمساعدة:** Dexter11x2@gmail.com

**الأوامر السريعة:**
```bash
# الاتصال بالـ VPS
ssh root@72.61.185.175

# الذهاب للمجلد
cd /var/www/gemawi

# عرض الحالة
docker-compose ps

# عرض اللوجات
docker-compose logs -f

# إعادة التشغيل
docker-compose restart
```

---

**🐳 نظام Gymmawy جاهز على Docker!**
**✅ سهل التحديث والصيانة**
**🚀 أداء عالي وموثوقية**
