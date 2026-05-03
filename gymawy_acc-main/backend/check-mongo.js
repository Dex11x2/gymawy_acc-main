require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI;
console.log('🔌 محاولة الاتصال بـ MongoDB Atlas...');
console.log('📍 الكلاستر:', uri.split('@')[1]?.split('/')[0] || 'غير معروف');

const start = Date.now();

mongoose.connect(uri, {
  serverSelectionTimeoutMS: 20000,
  socketTimeoutMS: 30000,
  connectTimeoutMS: 20000,
}).then(async () => {
  const elapsed = Date.now() - start;
  console.log(`\n✅ تم الاتصال بنجاح خلال ${elapsed}ms`);
  console.log('📊 اسم الداتابيز:', mongoose.connection.name);
  console.log('🌐 الهوست:', mongoose.connection.host);

  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`\n📚 عدد الـ Collections: ${collections.length}`);

    if (collections.length === 0) {
      console.log('⚠️  مفيش أي collections — الداتا ممكن لسه ما رجعتش');
    } else {
      console.log('\n📋 إحصائيات الـ Collections:');
      console.log('─'.repeat(60));
      let totalDocs = 0;
      for (const col of collections) {
        const count = await mongoose.connection.db.collection(col.name).countDocuments();
        totalDocs += count;
        const status = count > 0 ? '✅' : '⚠️';
        console.log(`${status} ${col.name.padEnd(35)} ${count.toString().padStart(8)} documents`);
      }
      console.log('─'.repeat(60));
      console.log(`📦 إجمالي الـ Documents: ${totalDocs}`);
      console.log(totalDocs > 0 ? '\n🎉 الداتا موجودة والسيرفر شغال تمام!' : '\n⚠️  الـ Collections موجودة لكن فاضية');
    }
  } catch (err) {
    console.error('❌ خطأ في قراءة الـ Collections:', err.message);
  }

  await mongoose.disconnect();
  process.exit(0);
}).catch((err) => {
  const elapsed = Date.now() - start;
  console.error(`\n❌ فشل الاتصال بعد ${elapsed}ms`);
  console.error('السبب:', err.message);
  if (err.reason) console.error('التفاصيل:', err.reason);
  process.exit(1);
});
