import { create } from 'zustand';
import api from '../services/api';

export interface Notification {
  id: string;
  userId: string;
  type: 'message' | 'task' | 'payroll' | 'approval' | 'system';
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  senderId?: string;
  senderName?: string;
  createdAt: Date;
}

interface NotificationState {
  notifications: Notification[];
  loadNotifications: () => Promise<void>;
  addNotification: (notification: Omit<Notification, 'id' | 'isRead' | 'createdAt'>) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
  getUnreadCount: (userId: string) => number;
  getUserNotifications: (userId: string) => Notification[];
  deleteNotification: (id: string) => Promise<void>;
}

const loadNotifications = (): Notification[] => {
  try {
    const stored = localStorage.getItem('gemawi-notifications');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveNotifications = (notifications: Notification[]) => {
  localStorage.setItem('gemawi-notifications', JSON.stringify(notifications));
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],

  loadNotifications: async () => {
    try {
      // Check if user is authenticated
      const auth = localStorage.getItem('gemawi-auth');
      if (!auth) {
        set({ notifications: loadNotifications() });
        return;
      }

      const response = await api.get('/notifications');
      const notifications = response.data.map((n: any) => ({
        ...n,
        id: n._id || n.id,
        createdAt: new Date(n.createdAt)
      }));
      set({ notifications });
    } catch (error: any) {
      // Only log error if it's not 401 (unauthorized)
      if (error.response?.status !== 401) {
        console.error('Failed to load notifications:', error);
      }
      // Fallback to localStorage
      set({ notifications: loadNotifications() });
    }
  },

  addNotification: (notification) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      isRead: false,
      createdAt: new Date()
    };

    const updated = [newNotification, ...get().notifications];
    set({ notifications: updated });
    saveNotifications(updated);

    // Show browser notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/logo.png'
      });
    }
  },

  markAsRead: async (id) => {
    try {
      // Update in backend
      await api.put(`/notifications/${id}/read`);
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
    
    // Update in state
    const updated = get().notifications.map(n =>
      n.id === id ? { ...n, isRead: true } : n
    );
    set({ notifications: updated });
    saveNotifications(updated);
  },

  markAllAsRead: async (userId) => {
    try {
      // Update in backend
      await api.put('/notifications/read-all');
      
      // Update in state
      const updated = get().notifications.map(n =>
        n.userId === userId ? { ...n, isRead: true } : n
      );
      set({ notifications: updated });
      saveNotifications(updated);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  },

  getUnreadCount: (userId) => {
    return get().notifications.filter(n => n.userId === userId && !n.isRead).length;
  },

  getUserNotifications: (userId) => {
    return get().notifications.filter(n => n.userId === userId);
  },

  deleteNotification: async (id) => {
    try {
      // Delete from backend
      await api.delete(`/notifications/${id}`);
    } catch (error) {
      console.error('Failed to delete notification from backend:', error);
    }
    
    // Delete from state
    const updated = get().notifications.filter(n => n.id !== id);
    set({ notifications: updated });
    saveNotifications(updated);
  }
}));

// Request notification permission
export const requestNotificationPermission = () => {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
};
