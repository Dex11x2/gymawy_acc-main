const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

// Test data
const testResults = [];

// Helper function to test endpoint
async function testEndpoint(name, method, url, requiresAuth = true, data = null) {
  try {
    const config = {
      method,
      url: `${API_BASE}${url}`,
      headers: requiresAuth ? {
        'Authorization': `Bearer test_token`
      } : {}
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    testResults.push({
      name,
      status: 'اتصال ناجح ✅',
      code: response.status,
      endpoint: url
    });
    return true;
  } catch (error) {
    const status = error.response?.status;
    // 401 means endpoint exists but needs auth (which is good)
    if (status === 401) {
      testResults.push({
        name,
        status: 'نقطة الوصول موجودة (تحتاج مصادقة) ✅',
        code: 401,
        endpoint: url
      });
      return true;
    }
    testResults.push({
      name,
      status: 'فشل الاتصال ❌',
      code: status || 'N/A',
      error: error.message,
      endpoint: url
    });
    return false;
  }
}

// Run tests
async function runTests() {
  console.log('🧪 بدء اختبار الاتصال بين الصفحات والـ Backend...\n');

  // Test public endpoints
  await testEndpoint('تسجيل مستخدم جديد', 'POST', '/register', false, {
    name: 'Test',
    email: 'test@test.com',
    companyName: 'Test Company'
  });

  // Test protected endpoints (will return 401 which means they exist)
  await testEndpoint('صفحة الموظفين', 'GET', '/employees');
  await testEndpoint('صفحة الأقسام', 'GET', '/departments');
  await testEndpoint('صفحة الرواتب', 'GET', '/payroll');
  await testEndpoint('صفحة المهام', 'GET', '/tasks');
  await testEndpoint('صفحة الإيرادات', 'GET', '/revenues');
  await testEndpoint('صفحة المصروفات', 'GET', '/expenses');
  await testEndpoint('صفحة الحضور', 'GET', '/attendance');
  await testEndpoint('صفحة الإشعارات', 'GET', '/notifications');
  await testEndpoint('صفحة الرسائل', 'GET', '/messages');
  await testEndpoint('صفحة المنشورات', 'GET', '/posts');
  await testEndpoint('صفحة الشكاوى', 'GET', '/complaints');
  await testEndpoint('صفحة التقييمات', 'GET', '/reviews');
  await testEndpoint('صفحة العهدة', 'GET', '/custody');
  await testEndpoint('صفحة السلف', 'GET', '/advances');
  await testEndpoint('صفحة الفروع', 'GET', '/branches');
  await testEndpoint('صفحة المناسبات', 'GET', '/occasions');
  await testEndpoint('صفحة التعليمات', 'GET', '/instructions');
  await testEndpoint('صفحة الدردشة', 'GET', '/chats');
  await testEndpoint('صفحة المستخدمين', 'GET', '/users');
  await testEndpoint('صفحة الصلاحيات', 'GET', '/permissions');

  // Print results
  console.log('\n' + '='.repeat(80));
  console.log('📊 نتائج الاختبار');
  console.log('='.repeat(80) + '\n');

  testResults.forEach((result, index) => {
    console.log(`${index + 1}. ${result.name}`);
    console.log(`   الحالة: ${result.status}`);
    console.log(`   الكود: ${result.code}`);
    console.log(`   النقطة: ${result.endpoint}`);
    if (result.error) {
      console.log(`   الخطأ: ${result.error}`);
    }
    console.log('');
  });

  const successCount = testResults.filter(r => r.status.includes('✅')).length;
  const failCount = testResults.filter(r => r.status.includes('❌')).length;

  console.log('='.repeat(80));
  console.log(`✅ نقاط نجحت: ${successCount}/${testResults.length}`);
  console.log(`❌ نقاط فشلت: ${failCount}/${testResults.length}`);
  console.log('='.repeat(80) + '\n');

  if (failCount === 0) {
    console.log('🎉 جميع نقاط الوصول تعمل بنجاح!');
  } else {
    console.log('⚠️ بعض نقاط الوصول تحتاج إلى مراجعة');
  }
}

runTests().catch(console.error);
