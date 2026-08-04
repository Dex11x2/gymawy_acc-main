import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging, SendResponse } from 'firebase-admin/messaging';
import DeviceToken from '../models/DeviceToken';

// إرسال إشعارات Push عبر Firebase Cloud Messaging.
// يتفعّل فقط لو متغير البيئة FIREBASE_SERVICE_ACCOUNT موجود (JSON للـservice account).
let initialized = false;
let enabled = false;

const init = () => {
  if (initialized) return;
  initialized = true;
  try {
    let raw = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    if (!raw) {
      console.log('ℹ️ FCM معطّل (لا يوجد FIREBASE_SERVICE_ACCOUNT)');
      return;
    }
    // يقبل JSON مباشر أو base64 (أسهل في متغيرات البيئة)
    if (!raw.trim().startsWith('{')) {
      raw = Buffer.from(raw, 'base64').toString('utf8');
    }
    const serviceAccount = JSON.parse(raw);
    if (!getApps().length) {
      initializeApp({ credential: cert(serviceAccount) });
    }
    enabled = true;
    console.log('✅ FCM جاهز');
  } catch (e: any) {
    console.error('❌ فشل تهيئة FCM:', e.message);
  }
};

export const sendPushToUser = async (
  userId: string,
  payload: { title: string; body: string; link?: string; type?: string }
) => {
  init();
  if (!enabled || !userId) return;
  try {
    const tokens = (await DeviceToken.find({ userId }).select('token'))
      .map((t) => t.token)
      .filter(Boolean);
    if (!tokens.length) return;

    const res = await getMessaging().sendEachForMulticast({
      tokens,
      notification: { title: payload.title, body: payload.body },
      data: { link: payload.link || '', type: payload.type || '' },
      android: { priority: 'high' },
    });

    // نظّف التوكنات غير الصالحة
    res.responses.forEach((r: SendResponse, i: number) => {
      const code = r.error?.code;
      if (!r.success && (code === 'messaging/invalid-registration-token' || code === 'messaging/registration-token-not-registered')) {
        DeviceToken.deleteOne({ token: tokens[i] }).catch(() => {});
      }
    });
  } catch (e: any) {
    console.error('FCM send error:', e.message);
  }
};
