import { Capacitor } from '@capacitor/core';
import api from './api';

// إشعارات Push للويب/PWA (بما فيها آيفون iOS 16.4+ لما يتضاف للشاشة الرئيسية).
// الباك-إند بيبعت عبر FCM لنفس التوكنات، فمفيش تغيير في الإرسال.
const firebaseConfig = {
  apiKey: 'AIzaSyBvVHQseDYe3t0Ai2kSuJlimrKtbx0HYUI',
  authDomain: 'gymmawy-3f96c.firebaseapp.com',
  projectId: 'gymmawy-3f96c',
  storageBucket: 'gymmawy-3f96c.firebasestorage.app',
  messagingSenderId: '735748938127',
  appId: '1:735748938127:web:0a20924f487a9dc16993fa',
};
const VAPID_KEY = 'BNlhzR5U-mbjkaLB7iDkxNMLY7baOw3CdTa6iB0CvjjIt7uJWT2ZyErEfTVnNj0pYg6cOx0CTE_eKs9-szJlREU';

// hasPrompted: لو true بنطلب الإذن حتى لو الحالة "default" (يتنادى من زر بلمسة المستخدم — مهم لآيفون)
export async function initWebPush(force = false): Promise<'granted' | 'denied' | 'unsupported' | 'skipped'> {
  if (Capacitor.isNativePlatform()) return 'skipped'; // التطبيق الأصلي بيستخدم plugin منفصل
  try {
    if (!('serviceWorker' in navigator) || !('Notification' in window) || !('PushManager' in window)) {
      return 'unsupported';
    }
    const { isSupported } = await import('firebase/messaging');
    if (!(await isSupported())) return 'unsupported';

    // على آيفون لازم يكون مثبّت على الشاشة الرئيسية (standalone)
    const standalone = (window.matchMedia?.('(display-mode: standalone)').matches) || (navigator as any).standalone;
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIOS && !standalone) return 'unsupported';

    let perm = Notification.permission;
    if (perm === 'default' && force) perm = await Notification.requestPermission();
    if (perm !== 'granted') return perm === 'denied' ? 'denied' : 'skipped';

    const { initializeApp } = await import('firebase/app');
    const { getMessaging, getToken } = await import('firebase/messaging');
    const app = initializeApp(firebaseConfig);
    const messaging = getMessaging(app);
    const reg = await navigator.serviceWorker.ready.catch(() => undefined);
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
    if (token) {
      await api.post('/device-tokens', { token, platform: 'web' });
    }
    return 'granted';
  } catch {
    return 'skipped';
  }
}

export const webPushState = (): 'granted' | 'denied' | 'default' | 'unavailable' => {
  if (Capacitor.isNativePlatform()) return 'unavailable';
  if (!('Notification' in window) || !('PushManager' in window)) return 'unavailable';
  return Notification.permission as any;
};
