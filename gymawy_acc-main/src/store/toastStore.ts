import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastState {
  toasts: ToastItem[];
  push: (message: string, type?: ToastType, duration?: number) => void;
  remove: (id: number) => void;
}

let seq = 1;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (message, type = 'info', duration = 3500) => {
    // امنع التكرار السريع لنفس الرسالة
    const existing = get().toasts;
    if (existing.some((t) => t.message === message)) return;
    const id = seq++;
    set({ toasts: [...existing, { id, message, type, duration }] });
  },
  remove: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

// مساعد للاستخدام خارج مكوّنات React (مثلاً في interceptors)
export const toast = (message: string, type: ToastType = 'info', duration?: number) =>
  useToastStore.getState().push(message, type, duration);
