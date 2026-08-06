import type { CapacitorConfig } from '@capacitor/cli';

// تطبيق جيماوي — تطبيق أصلي (Android/iOS) بواجهة مدمجة داخل التطبيق.
// الواجهة متحزّمة جوّه الـAPK (webDir: dist) بدل ما يفتح موقع بعيد — ده بيشيل تحذير
// "غير آمن" من Google Play Protect (اللي بيتسبّب فيه نمط "قشرة تفتح موقع") وبيخلّي
// التشغيل أسرع. الداتا بتفضل حيّة عبر مكالمات API مباشرة لـ https://gymmawy.net/api.
// تحديثات الواجهة تحتاج إعادة بناء APK (متأتمتة عبر GitHub Actions).
const config: CapacitorConfig = {
  appId: 'net.gymmawy.app',
  appName: 'جيماوي',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
  server: {
    androidScheme: 'https', // الـWebView origin يبقى https://localhost (مهم للـCORS)
  },
};

export default config;
