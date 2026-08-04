// صوت إشعارات على مستوى النظام (مولّد برمجياً عبر Web Audio — بدون ملفات صوت)

const SOUND_KEY = 'notif-sound-enabled';
const MUTED_TYPES_KEY = 'notif-muted-types';

export const isSoundEnabled = (): boolean => localStorage.getItem(SOUND_KEY) !== 'false';

export const setSoundEnabled = (enabled: boolean): void => {
  localStorage.setItem(SOUND_KEY, enabled ? 'true' : 'false');
};

// كتم نوع معيّن من الإشعارات (يمنع الصوت لهذا النوع)
export const getMutedTypes = (): string[] => {
  try {
    const raw = localStorage.getItem(MUTED_TYPES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const isTypeMuted = (type?: string): boolean => {
  if (!type) return false;
  return getMutedTypes().includes(type);
};

export const setTypeMuted = (type: string, muted: boolean): void => {
  const current = new Set(getMutedTypes());
  if (muted) current.add(type);
  else current.delete(type);
  localStorage.setItem(MUTED_TYPES_KEY, JSON.stringify([...current]));
};

let ctx: AudioContext | null = null;

const getCtx = (): AudioContext | null => {
  try {
    if (!ctx) {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    return ctx;
  } catch {
    return null;
  }
};

// تهيئة/إيقاظ سياق الصوت بعد أول تفاعل من المستخدم (سياسات المتصفح)
export const primeNotificationSound = (): void => {
  const c = getCtx();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
};

// نغمة قصيرة لطيفة من نبرتين
export const playNotificationSound = (): void => {
  if (!isSoundEnabled()) return;
  const c = getCtx();
  if (!c) return;
  try {
    if (c.state === 'suspended') c.resume().catch(() => {});
    const now = c.currentTime;
    const tones: Array<[number, number]> = [[880, 0], [1174.66, 0.12]];
    tones.forEach(([freq, offset]) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = now + offset;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.22, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.32);
      osc.connect(gain).connect(c.destination);
      osc.start(start);
      osc.stop(start + 0.36);
    });
  } catch {
    // تجاهل بصمت
  }
};
