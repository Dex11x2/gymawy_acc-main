# 🐳 دليل تحديث Docker بعد رفع التغييرات

## ❌ المشكلة

عند رفع التغييرات على GitHub وسحبها بـ `git pull`، التغييرات لا تظهر في Docker لأن:
1. **Docker يستخدم Cache** للطبقات القديمة
2. **الصور (Images) القديمة** لا تزال موجودة
3. **الـ Containers** تعمل بالكود القديم

---

## ✅ الحل الكامل

### الطريقة 1️⃣: إعادة بناء كاملة بدون Cache (الأفضل)

```bash
# 1. إيقاف كل الـ containers
docker-compose down

# 2. حذف الصور القديمة
docker rmi gemawi-pro-accounting-system1-frontend
docker rmi gemawi-pro-accounting-system1-backend

# 3. إعادة البناء بدون cache
docker-compose build --no-cache

# 4. تشغيل الـ containers الجديدة
docker-compose up -d
```

### الطريقة 2️⃣: أوامر سريعة في سطر واحد

```bash
# كل شيء في أمر واحد
docker-compose down && docker-compose build --no-cache && docker-compose up -d
```

### الطريقة 3️⃣: استخدام السكريبت الجاهز

```bash
# في Windows (PowerShell)
./deploy.ps1

# في Linux/Mac
chmod +x deploy.sh
./deploy.sh
```

---

## 📋 الخطوات التفصيلية

### 1. سحب التغييرات من GitHub

```bash
# الدخول لمجلد المشروع
cd /path/to/gemawi-pro-accounting-system

# سحب آخر التحديثات
git pull origin main
```

### 2. إيقاف الـ Containers الحالية

```bash
# إيقاف وحذف الـ containers
docker-compose down

# (اختياري) حذف الـ volumes أيضاً
docker-compose down -v
```

### 3. حذف الصور القديمة

```bash
# عرض كل الصور
docker images

# حذف صور المشروع القديمة
docker rmi gemawi-pro-accounting-system1-frontend
docker rmi gemawi-pro-accounting-system1-backend

# أو حذف كل الصور غير المستخدمة
docker image prune -a
```

### 4. إعادة البناء بدون Cache

```bash
# بناء كامل بدون cache
docker-compose build --no-cache

# أو بناء خدمة واحدة فقط
docker-compose build --no-cache frontend
docker-compose build --no-cache backend
```

### 5. تشغيل الـ Containers الجديدة

```bash
# تشغيل في الخلفية
docker-compose up -d

# أو تشغيل مع عرض اللوجات
docker-compose up
```

---

## 🔍 التحقق من التحديثات

### فحص أن الكود الجديد يعمل

```bash
# عرض لوجات الـ containers
docker-compose logs -f

# عرض لوجات خدمة معينة
docker-compose logs -f frontend
docker-compose logs -f backend

# التحقق من حالة الـ containers
docker-compose ps
```

### فحص المتصفح

1. **امسح Cache المتصفح**: `Ctrl + Shift + Delete`
2. **Hard Refresh**: `Ctrl + F5`
3. **افتح Developer Tools**: `F12`
4. **تحقق من Console** للأخطاء
5. **افحص Network Tab** لرؤية الملفات المحملة

---

## ⚡ أوامر مفيدة

### عرض معلومات Docker

```bash
# عرض كل الـ containers (حتى المتوقفة)
docker ps -a

# عرض كل الصور
docker images

# عرض استخدام المساحة
docker system df

# عرض معلومات مفصلة عن container
docker inspect gemawi-frontend
```

### تنظيف Docker

```bash
# حذف كل الـ containers المتوقفة
docker container prune

# حذف كل الصور غير المستخدمة
docker image prune -a

# حذف كل الـ volumes غير المستخدمة
docker volume prune

# تنظيف شامل (احذر!)
docker system prune -a --volumes
```

### الدخول داخل Container

```bash
# الدخول لـ frontend container
docker exec -it gemawi-frontend sh

# الدخول لـ backend container
docker exec -it gemawi-backend sh

# تشغيل أمر معين داخل container
docker exec gemawi-backend ls -la /app
```

---

## 🚨 حل المشاكل الشائعة

### المشكلة 1: التغييرات لا تظهر

**الحل:**
```bash
# امسح كل شيء وابدأ من جديد
docker-compose down -v
docker image prune -a -f
docker-compose build --no-cache
docker-compose up -d
```

### المشكلة 2: Port مستخدم بالفعل

**الحل:**
```bash
# ابحث عن العملية التي تستخدم Port 80
# Windows
netstat -ano | findstr :80

# Linux/Mac
lsof -i :80

# أوقف Docker القديم
docker-compose down
```

### المشكلة 3: Out of Space

**الحل:**
```bash
# نظف المساحة
docker system prune -a --volumes -f

# احذف Build Cache
docker builder prune -a -f
```

### المشكلة 4: Build يفشل

**الحل:**
```bash
# تأكد من وجود الملفات الصحيحة
ls -la Dockerfile.frontend
ls -la Dockerfile.backend
ls -la docker-compose.yml

# جرب rebuild لخدمة واحدة
docker-compose build --no-cache --progress=plain frontend
```

---

## 📦 أفضل الممارسات

### 1. استخدم Git Tags للإصدارات

```bash
# قبل كل deployment
git tag -a v1.0.1 -m "Release v1.0.1 with login improvements"
git push origin v1.0.1
```

### 2. احتفظ بـ Backup للبيانات

```bash
# Backup volumes
docker run --rm -v gemawi_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/gemawi-backup-$(date +%Y%m%d).tar.gz /data
```

### 3. استخدم .dockerignore

تأكد من وجود ملف `.dockerignore`:
```
node_modules
.git
.env
*.log
dist
build
```

### 4. راقب اللوجات

```bash
# شغل لوجات دائمة في نافذة منفصلة
docker-compose logs -f --tail=100
```

---

## 🔄 سير العمل الموصى به

### للتحديثات الصغيرة (Bug Fixes)

```bash
git pull origin main
docker-compose down
docker-compose build
docker-compose up -d
```

### للتحديثات الكبيرة (Features)

```bash
git pull origin main
docker-compose down
docker rmi gemawi-pro-accounting-system1-frontend gemawi-pro-accounting-system1-backend
docker-compose build --no-cache
docker-compose up -d
docker-compose logs -f
```

### للتحديثات الحرجة (Production)

```bash
# 1. Backup
docker-compose down
# Backup your data here

# 2. Pull & Build
git pull origin main
docker-compose build --no-cache --pull

# 3. Test
docker-compose up

# 4. If OK, run in background
docker-compose up -d

# 5. Monitor
docker-compose logs -f
```

---

## 📊 مراقبة الأداء

```bash
# مراقبة استخدام الموارد
docker stats

# عرض استخدام كل container
docker stats gemawi-frontend gemawi-backend

# فحص الصحة
docker-compose ps
```

---

## 🎯 ملخص سريع

**للتحديث بعد git pull:**

```bash
# الأمر الواحد الشامل ✅
docker-compose down && \
docker rmi gemawi-pro-accounting-system1-frontend gemawi-pro-accounting-system1-backend && \
docker-compose build --no-cache && \
docker-compose up -d && \
docker-compose logs -f
```

**أو استخدم السكريبت الجاهز:**
```bash
./deploy.sh  # Linux/Mac
./deploy.ps1 # Windows
```

---

## 📞 المساعدة

إذا واجهت مشاكل:
1. تحقق من اللوجات: `docker-compose logs`
2. تحقق من حالة الـ containers: `docker-compose ps`
3. جرب rebuild كامل: `docker-compose build --no-cache`
4. نظف Docker: `docker system prune -a`

---

**تم بواسطة:** Claude Code
**آخر تحديث:** 2025-11-19
