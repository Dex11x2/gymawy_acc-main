import { create } from 'zustand';

interface SettingsState {
  language: 'ar' | 'en';
  theme: 'light' | 'dark';
  setLanguage: (lang: 'ar' | 'en') => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
}

const loadSettings = () => {
  try {
    const stored = localStorage.getItem('gemawi-settings');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
  return { language: 'ar', theme: 'light' };
};

const saveSettings = (settings: any) => {
  localStorage.setItem('gemawi-settings', JSON.stringify(settings));
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...loadSettings(),
  
  setLanguage: (lang) => {
    set({ language: lang });
    saveSettings({ ...get(), language: lang });
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  },
  
  setTheme: (theme) => {
    set({ theme });
    saveSettings({ ...get(), theme });
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },
  
  toggleTheme: () => {
    const newTheme = get().theme === 'light' ? 'dark' : 'light';
    get().setTheme(newTheme);
  }
}));
