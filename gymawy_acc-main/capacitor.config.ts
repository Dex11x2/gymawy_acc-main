import type { CapacitorConfig } from '@capacitor/cli';

// تطبيق جيماوي — قشرة أصلية (Android/iOS) بتحمّل الموقع الحيّ.
// المزايا: تحديثات فورية (تنشر الويب فيتحدّث التطبيق) بدون إعادة بناء الـAPK،
// و/api النسبي بيتحل تلقائيًا على gymmawy.net فمفيش تعديل CORS.
const config: CapacitorConfig = {
  appId: 'net.gymmawy.app',
  appName: 'جيماوي',
  webDir: 'dist',
  server: {
    url: 'https://gymmawy.net',
    cleartext: false,
  },
  android: {
    // يمنع لقطات الشاشة في التطبيقات الحساسة؟ سيبها false افتراضيًا
    allowMixedContent: false,
  },
};

export default config;
