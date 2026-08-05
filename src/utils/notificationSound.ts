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

// نغمة إشعار واضحة (3 نبرات صاعدة) + اهتزاز خفيف على الموبايل عشان تاخد البال
export const playNotificationSound = (): void => {
  if (!isSoundEnabled()) return;

  // اهتزاز خفيف على الأندرويد/الموبايل (لو مدعوم)
  try { (navigator as any).vibrate?.([40, 40, 40]); } catch { /* ignore */ }

  const c = getCtx();
  if (!c) return;
  try {
    if (c.state === 'suspended') c.resume().catch(() => {});
    const now = c.currentTime;
    // نغمة "دِن-دِن-دِن" صاعدة (ثلاثي كبير)
    const tones: Array<[number, number]> = [[659.25, 0], [830.61, 0.11], [987.77, 0.22]];
    tones.forEach(([freq, offset]) => {
      const osc = c.createOscillator();
      const osc2 = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      osc2.type = 'triangle';
      osc.frequency.value = freq;
      osc2.frequency.value = freq * 2; // طبقة أعلى لصوت أوضح
      const start = now + offset;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.34, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(c.destination);
      osc.start(start); osc2.start(start);
      osc.stop(start + 0.32); osc2.stop(start + 0.32);
    });
  } catch {
    // تجاهل بصمت
  }
};
