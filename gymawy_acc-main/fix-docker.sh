#!/bin/bash

echo "🔧 إصلاح مشكلة Docker..."

# 1. إيقاف جميع الحاويات
echo "⏹️ إيقاف الحاويات..."
docker-compose down

# 2. حذف الحاويات القديمة
echo "🗑️ حذف الحاويات القديمة..."
docker rm -f gemawi-backend gemawi-frontend 2>/dev/null || true

# 3. حذف الصور القديمة
echo "🗑️ حذف الصور القديمة..."
docker rmi gymawy_acc-backend gymawy_acc-frontend 2>/dev/null || true

# 4. تنظيف Docker
echo "🧹 تنظيف Docker..."
docker system prune -f

# 5. إعادة بناء الصور
echo "🔨 إعادة بناء الصور..."
docker-compose build --no-cache

# 6. تشغيل الحاويات
echo "🚀 تشغيل الحاويات..."
docker-compose up -d

# 7. عرض الحالة
echo "✅ تم الإصلاح! الحالة:"
docker-compose ps

echo ""
echo "📊 السجلات:"
docker-compose logs --tail=50
