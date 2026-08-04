# 🔐 دليل إعداد SSL

## 📦 الملفات الجاهزة:

1. ✅ **nginx-ssl.conf** - إعدادات Nginx مع SSL
2. ✅ **setup-ssl.sh** - Script تلقائي لإعداد SSL
3. ✅ **docker-compose.yml** - يحتوي على SSL volumes

---

## 🚀 الطريقة الأولى: Script تلقائي (الأسهل)

### 1️⃣ ارفع الملفات على VPS:

```bash
# من جهازك المحلي
scp nginx-ssl.conf root@72.61.185.175:/var/www/gymawy_acc/
scp setup-ssl.sh root@72.61.185.175:/var/www/gymawy_acc/
```

### 2️⃣ على VPS - شغل الـ Script:

```bash
ssh root@72.61.185.175
cd /var/www/gymawy_acc
chmod +x setup-ssl.sh
./setup-ssl.sh
```

**هذا كل شيء!** 🎉

---

## 🛠️ الطريقة الثانية: يدوياً (خطوة بخطوة)

### 1️⃣ ارفع nginx-ssl.conf:

```bash
scp nginx-ssl.conf root@72.61.185.175:/var/www/gymawy_acc/
```

### 2️⃣ على VPS:

```bash
ssh root@72.61.185.175
cd /var/www/gymawy_acc

# أوقف Frontend
docker-compose stop frontend

# ثبت Certbot
apt update
apt install -y certbot

# احصل على الشهادة
certbot certonly --standalone -d gymmawy.net -d www.gymmawy.net

# أنشئ مجلد SSL
mkdir -p ssl

# انسخ الشهادات
cp /etc/letsencrypt/live/gymmawy.net/fullchain.pem ssl/
cp /etc/letsencrypt/live/gymmawy.net/privkey.pem ssl/

# اضبط الأذونات
chmod 644 ssl/fullchain.pem
chmod 600 ssl/privkey.pem

# احفظ نسخة احتياطية
cp nginx.conf nginx.conf.backup

# استخدم nginx-ssl.conf
cp nginx-ssl.conf nginx.conf

# شغل Frontend
docker-compose up -d --build frontend

# تابع اللوجات
docker-compose logs -f frontend
```

### 3️⃣ إعداد التجديد التلقائي:

```bash
cat > /etc/cron.d/certbot-renew << 'EOF'
0 0 * * * root certbot renew --quiet && cp /etc/letsencrypt/live/gymmawy.net/fullchain.pem /var/www/gymawy_acc/ssl/ && cp /etc/letsencrypt/live/gymmawy.net/privkey.pem /var/www/gymawy_acc/ssl/ && cd /var/www/gymawy_acc && docker-compose restart frontend
EOF

chmod 644 /etc/cron.d/certbot-renew
```

---

## 🧪 الاختبار:

### 1. اختبر HTTPS:
```bash
curl -I https://gymmawy.net
```

### 2. افتح المتصفح:
```
https://gymmawy.net
```

### 3. تحقق من الشهادة:
```bash
openssl s_client -connect gymmawy.net:443 -servername gymmawy.net
```

---

## 🔧 استكشاف الأخطاء:

### المشكلة: Certbot يفشل

```bash
# تأكد من إيقاف Frontend
docker-compose stop frontend

# تأكد من عدم وجود خدمة على البورت 80
netstat -tulpn | grep :80

# أعد المحاولة
certbot certonly --standalone -d gymmawy.net -d www.gymmawy.net
```

### المشكلة: SSL لا يعمل

```bash
# تحقق من الشهادات
ls -la /var/www/gymawy_acc/ssl/

# تحقق من nginx.conf
docker exec -it gemawi-frontend cat /etc/nginx/conf.d/default.conf

# أعد تشغيل Frontend
docker-compose restart frontend
```

### المشكلة: Cloudflare SSL Error

في لوحة تحكم Cloudflare:
1. اذهب إلى **SSL/TLS**
2. اختر **Full** أو **Full (strict)**
3. انتظر 2-5 دقائق

---

## ✅ Checklist:

- [ ] nginx-ssl.conf مرفوع
- [ ] setup-ssl.sh مرفوع (اختياري)
- [ ] Certbot مثبت
- [ ] شهادة SSL تم الحصول عليها
- [ ] الشهادات منسوخة في ssl/
- [ ] nginx.conf محدث
- [ ] Frontend يعمل
- [ ] HTTPS يفتح
- [ ] التجديد التلقائي مفعل

---

## 🎯 الأوامر السريعة:

```bash
# حالة الـ containers
docker-compose ps

# لوجات Frontend
docker-compose logs -f frontend

# اختبار SSL
curl -I https://gymmawy.net

# إعادة تشغيل
docker-compose restart frontend
```

---

**🔐 موقعك الآن آمن مع HTTPS!** 🎉
