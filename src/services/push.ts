import { Capacitor } from '@capacitor/core';
import api from './api';

// تسجيل الجهاز لاستقبال إشعارات Push (يعمل فقط داخل تطبيق الموبايل الأصلي)
export async function initPush() {
  if (!Capacitor.isNativePlatform()) return; // على الويب/PWA نتجاهل (له مسار منفصل)
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== 'granted') return;

    await PushNotifications.register();

    // أرسل توكن الجهاز للباك-إند
    PushNotifications.addListener('registration', async (token) => {
      try {
        await api.post('/device-tokens', { token: token.value, platform: Capacitor.getPlatform() });
      } catch { /* ignore */ }
    });

    // عند الضغط على الإشعار افتح الصفحة المرتبطة
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const link = (action.notification.data as any)?.link;
      if (link) window.location.href = link;
    });
  } catch { /* ignore */ }
}
