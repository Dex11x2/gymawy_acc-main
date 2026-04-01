import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ContentType from '../models/ContentType';
import User from '../models/User';

// Load environment variables
dotenv.config();

const DEFAULT_CONTENT_TYPES = [
  {
    key: 'short_video',
    nameAr: 'فيديو قصير',
    nameEn: 'Short Video',
    defaultPrice: 50,
    currency: 'SAR' as const,
    displayOrder: 1
  },
  {
    key: 'long_video',
    nameAr: 'فيديو طويل',
    nameEn: 'Long Video',
    defaultPrice: 150,
    currency: 'SAR' as const,
    displayOrder: 2
  },
  {
    key: 'vlog',
    nameAr: 'فلوج',
    nameEn: 'Vlog',
    defaultPrice: 200,
    currency: 'SAR' as const,
    displayOrder: 3
  },
  {
    key: 'podcast',
    nameAr: 'بودكاست',
    nameEn: 'Podcast',
    defaultPrice: 100,
    currency: 'SAR' as const,
    displayOrder: 4
  },
  {
    key: 'post_design',
    nameAr: 'تصميم بوست',
    nameEn: 'Post Design',
    defaultPrice: 30,
    currency: 'SAR' as const,
    displayOrder: 5
  },
  {
    key: 'thumbnail',
    nameAr: 'صورة مصغرة',
    nameEn: 'Thumbnail',
    defaultPrice: 20,
    currency: 'SAR' as const,
    displayOrder: 6
  }
];

async function migrateContentTypes() {
  try {
    console.log('🔄 بدء ترحيل أنواع المحتوى...');

    // الاتصال بقاعدة البيانات
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/your-database';
    await mongoose.connect(mongoUri);
    console.log('✅ تم الاتصال بقاعدة البيانات');

    // البحث عن أول super admin لاستخدامه كـ createdBy
    const superAdmin = await User.findOne({ role: 'super_admin' });

    if (!superAdmin) {
      console.error('❌ لم يتم العثور على super admin في النظام');
      console.log('💡 يرجى إنشاء super admin أولاً');
      process.exit(1);
    }

    console.log(`✅ تم العثور على Super Admin: ${superAdmin.name || superAdmin.email}`);

    // التحقق من أنواع المحتوى الموجودة
    const existingContentTypes = await ContentType.find();
    console.log(`📊 عدد أنواع المحتوى الموجودة: ${existingContentTypes.length}`);

    let createdCount = 0;
    let skippedCount = 0;

    // إضافة أنواع المحتوى الافتراضية
    for (const contentType of DEFAULT_CONTENT_TYPES) {
      const existing = await ContentType.findOne({ key: contentType.key });

      if (existing) {
        console.log(`⏭️  تخطي ${contentType.nameAr} (${contentType.key}) - موجود بالفعل`);
        skippedCount++;
      } else {
        await ContentType.create({
          ...contentType,
          isActive: true,
          createdBy: superAdmin._id
        });
        console.log(`✅ تم إضافة ${contentType.nameAr} (${contentType.key})`);
        createdCount++;
      }
    }

    console.log('\n📊 ملخص الترحيل:');
    console.log(`   ✅ تم إنشاء: ${createdCount}`);
    console.log(`   ⏭️  تم التخطي: ${skippedCount}`);
    console.log(`   📦 الإجمالي: ${existingContentTypes.length + createdCount}`);

    console.log('\n✅ اكتملت عملية ترحيل أنواع المحتوى بنجاح!');

    // عرض جميع أنواع المحتوى النهائية
    const allContentTypes = await ContentType.find({ isActive: true }).sort({ displayOrder: 1 });
    console.log('\n📋 أنواع المحتوى النشطة:');
    allContentTypes.forEach((ct, index) => {
      console.log(`   ${index + 1}. ${ct.nameAr} (${ct.key}) - ${ct.defaultPrice} ${ct.currency}`);
    });

  } catch (error) {
    console.error('❌ حدث خطأ أثناء الترحيل:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 تم قطع الاتصال بقاعدة البيانات');
    process.exit(0);
  }
}

// تشغيل السكريبت
migrateContentTypes();
