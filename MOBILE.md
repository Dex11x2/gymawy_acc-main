# تطبيق جيماوي للموبايل (Android / iOS) — Capacitor

التطبيق **قشرة أصلية** (Native shell) بتحمّل الموقع الحيّ `https://gymmawy.net` جوه تطبيق أندرويد/آيفون.
ده معناه:
- **تحديثات فورية**: أول ما تنشر الويب، التطبيق يتحدّث لوحده — من غير إعادة بناء الـAPK.
- الـ`/api` والـSocket بيشتغلوا زي ما هما (مفيش تعديل CORS ولا سيرفر).

المعرّف: `net.gymmawy.app` · الاسم: «جيماوي» · الأيقونة/السبلاش مولّدين من لوجو جيماوي.

---

## بناء نسخة أندرويد (APK)

### المتطلبات (مرة واحدة على جهازك)
- **Android Studio** (بيجيب Android SDK + JDK 17 معاه).
- Node.js (موجود).

### الخطوات
```bash
cd gymawy_acc-main
npm install            # لو أول مرة
npm run cap:sync       # يبني الويب (fallback) ويزامن مشروع أندرويد
npm run cap:open       # يفتح المشروع في Android Studio
```
جوه Android Studio:
1. استنى Gradle يخلّص مزامنة.
2. **Build ▸ Build Bundle(s) / APK(s) ▸ Build APK(s)**.
3. الـAPK بيطلع في: `android/app/build/outputs/apk/debug/app-debug.apk`
4. انقل الملف للموبايل وثبّته (فعّل «تثبيت من مصادر غير معروفة»).

### أو من غير ما تفتح Android Studio (لو الـSDK متظبّط)
```bash
npm run cap:apk
# الناتج: android/app/build/outputs/apk/debug/app-debug.apk
```

> نسخة **الإصدار (release/موقّعة)** للنشر على Play Store: من Android Studio ▸ **Build ▸ Generate Signed Bundle / APK** (محتاج keystore).

---

## بناء نسخة آيفون (iOS)
محتاج **جهاز Mac + Xcode**. على الماك:
```bash
npm install
npm install @capacitor/ios
npx cap add ios
npm run cap:sync   # (أو: npx cap sync ios)
npx cap open ios   # يفتح Xcode → Run / Archive
```
النشر على App Store محتاج حساب Apple Developer (99$/سنة).

---

## تحديث محتوى التطبيق
مفيش أي خطوة — التطبيق بيحمّل `https://gymmawy.net`. انشر الويب زي المعتاد والتطبيق يتحدّث تلقائيًا.

## لو غيّرت الأيقونة
حط صورة مربعة 1024×1024+ في `assets/icon.png` وشغّل:
```bash
npx @capacitor/assets generate --android --iconBackgroundColor '#0f172a' --splashBackgroundColor '#0f172a'
```

---

## مرحلة تانية (اختياري لاحقًا)
- **إشعارات Push حقيقية والتطبيق مقفول** (FCM أندرويد / APNs آيفون): محتاجة نضمّن Capacitor runtime + plugin الإشعارات جوه بناء الويب ونربط FCM.
- **وضع Offline كامل + متجر بمعايير أعلى**: نبدّل من `server.url` لتضمين ملفات الويب داخل التطبيق (bundled) — بس ساعتها لازم نظبط CORS للـorigin بتاع Capacitor ونعيد البناء مع كل تحديث.
