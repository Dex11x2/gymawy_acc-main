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
  initAuth: () => void;
  refreshUser: () => Promise<void>;
}

const loadAuth = () => {
  try {
    const stored = localStorage.getItem("gemawi-auth");
    if (stored) {
      const { user, isAuthenticated } = JSON.parse(stored);
      return { user, isAuthenticated };
    }
  } catch (error) {
    console.error("Error loading auth:", error);
  }
  return { user: null, isAuthenticated: false };
};

const authStore = create<AuthState>((set, get) => ({
  ...loadAuth(),
  isLoading: false,

  login: async (emailOrPhone: string, password: string) => {
    set({ isLoading: true });
    try {
      const response = await api.post('/auth/login', {
        email: emailOrPhone,
        password
      });
      
      const { token, user } = response.data;
      console.log('🔑 Login response user:', user);
      console.log('📋 User permissions:', user.permissions);
      
      // Save to localStorage first
      localStorage.setItem(
        "gemawi-auth",
        JSON.stringify({ user, isAuthenticated: true, token })
      );
      
      // Then update state
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
      
      console.log('✅ User logged in successfully with permissions:', user.permissions);
    } catch (error: any) {
      set({ isLoading: false, user: null, isAuthenticated: false });
      throw new Error(error.response?.data?.message || 'فشل تسجيل الدخول');
    }
  },

  logout: () => {
    set({ user: null, isAuthenticated: false });
    localStorage.removeItem("gemawi-auth");
  },

  setUser: (user: User) => {
    const auth = localStorage.getItem('gemawi-auth');
    let token = '';
    if (auth) {
      try {
        const parsed = JSON.parse(auth);
        token = parsed.token || '';
      } catch (e) {}
    }
    set({ user, isAuthenticated: true });
    localStorage.setItem(
      "gemawi-auth",
      JSON.stringify({ user, isAuthenticated: true, token })
    );
  },

  updateUser: async (userId: string, data: any) => {
    const { user } = get();
    if (user && user.id === userId) {
      try {
        // Update in backend first
        await api.put(`/users/${userId}`, data);
        
        // Then update locally
        const updatedUser = { ...user, ...data };
        set({ user: updatedUser });
        const auth = localStorage.getItem('gemawi-auth');
        let token = '';
        if (auth) {
          try {
            const parsed = JSON.parse(auth);
            token = parsed.token || '';
          } catch (e) {}
        }
        localStorage.setItem(
          "gemawi-auth",
          JSON.stringify({ user: updatedUser, isAuthenticated: true, token })
        );
      } catch (error) {
        console.error('Failed to update user:', error);
        throw error;
      }
    }
  },

  getUserById: (userId: string) => {
    const { user } = get();
    if (user && user.id === userId) {
      return user;
    }
    return null;
  },

  initAuth: () => {
    const auth = loadAuth();
    set(auth);
  },

  refreshUser: async () => {
    try {
      const response = await api.get('/auth/me');
      const updatedUser = response.data;
      console.log('🔄 User refreshed:', updatedUser);
      console.log('📋 Updated permissions:', updatedUser.permissions);
      
      const { setUser } = get();
      setUser(updatedUser);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  },
}));

export const useAuthStore = authStore;
export default authStore;
