import axios from 'axios';
import { Capacitor } from '@capacitor/core';
import { useToastStore } from '../store/toastStore';

// في التطبيق الأصلي (المدمج) الـorigin بيبقى localhost — فلازم نكلّم السيرفر بعنوان مطلق.
// على الويب بنكمّل بالإعداد النسبي (VITE_API_URL=/api) زي ما هو.
const API_URL = Capacitor.isNativePlatform()
  ? 'https://gymmawy.net/api'
  : ((import.meta as any).env?.VITE_API_URL || 'http://localhost:3000/api');

const TOKEN_KEY = 'gemawi-token';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 15000
});

api.interceptors.request.use(
  (config) => {
    // نقرأ من localStorage عشان الجلسة تفضل بعد قفل التاب
    const token = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url: string = error.config?.url || '';
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/me');

    if (status === 401 && !isAuthEndpoint && !window.location.pathname.includes('/login')) {
      // انتهت الجلسة — امسح التوكن وارجع لتسجيل الدخول برسالة واضحة
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      localStorage.setItem('gemawi-session-expired', '1');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // أظهر خطأ عام للمستخدم عند أعطال الشبكة/السيرفر (مش أخطاء التحقق العادية 4xx)
    try {
      if (!error.response) {
        useToastStore.getState().push('تعذّر الاتصال بالخادم — تأكد من الإنترنت', 'error');
      } else if (status >= 500) {
        useToastStore.getState().push('حدث خطأ في الخادم، حاول مرة أخرى', 'error');
      }
    } catch { /* ignore */ }

    return Promise.reject(error);
  }
);

export default api;
