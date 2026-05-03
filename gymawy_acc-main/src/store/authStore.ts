import { create } from "zustand";
import { User } from "../types";
import api from "../services/api";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (emailOrPhone: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  updateUser: (userId: string, data: any) => Promise<void>;
  getUserById: (userId: string) => User | null;
  initAuth: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const TOKEN_KEY = "gemawi-token";

export const getStoredToken = (): string | null => {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

const setStoredToken = (token: string) => {
  try { sessionStorage.setItem(TOKEN_KEY, token); } catch {}
};

const clearStoredToken = () => {
  try { sessionStorage.removeItem(TOKEN_KEY); } catch {}
};

const authStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: !!getStoredToken(),
  isLoading: false,

  login: async (emailOrPhone: string, password: string) => {
    set({ isLoading: true });
    try {
      const response = await api.post('/auth/login', {
        email: emailOrPhone,
        password
      });

      const { token, user } = response.data;
      setStoredToken(token);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      clearStoredToken();
      set({ isLoading: false, user: null, isAuthenticated: false });
      throw new Error(error.response?.data?.message || 'فشل تسجيل الدخول');
    }
  },

  logout: () => {
    clearStoredToken();
    set({ user: null, isAuthenticated: false });
  },

  setUser: (user: User) => {
    set({ user, isAuthenticated: true });
  },

  updateUser: async (userId: string, data: any) => {
    const { user } = get();
    if (user && user.id === userId) {
      await api.put(`/users/${userId}`, data);
      set({ user: { ...user, ...data } });
    }
  },

  getUserById: (userId: string) => {
    const { user } = get();
    return user && user.id === userId ? user : null;
  },

  initAuth: async () => {
    try { localStorage.removeItem("gemawi-auth"); } catch {}
    const token = getStoredToken();
    if (!token) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }
    set({ isAuthenticated: true, isLoading: true });
    try {
      const response = await api.get('/auth/me');
      set({ user: response.data, isAuthenticated: true, isLoading: false });
    } catch {
      clearStoredToken();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  refreshUser: async () => {
    try {
      const response = await api.get('/auth/me');
      set({ user: response.data, isAuthenticated: true });
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  },
}));

export const useAuthStore = authStore;
export default authStore;
