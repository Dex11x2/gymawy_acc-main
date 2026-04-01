import React from 'react';
import { useNotificationStore } from '../store/notificationStore';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

export const NotificationPanel: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const { getUserNotifications, markAllAsRead, deleteNotification } = useNotificationStore();
  const navigate = useNavigate();

  const notifications = getUserNotifications(user?.id || '');
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleNotificationClick = async (notification: any) => {
    // Delete notification
    await deleteNotification(notification.id);
    
    if (notification.link) {
      navigate(notification.link);
      onClose();
    }
  };

  const typeIcons = {
    message: '💬',
    task: '📋',
    payroll: '💵',
    approval: '✅',
    system: '⚙️'
  };

  if (!isOpen) return null;

  return (
    <div className="absolute left-0 top-16 w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h3 className="font-bold text-gray-800 dark:text-white">الإشعارات ({unreadCount})</h3>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsRead(user?.id || '')}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            ✓ تعليم الكل كمقروء
          </button>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-2">🔔</div>
            <p>لا توجد إشعارات</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                !notification.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{typeIcons[notification.type]}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-gray-800 dark:text-white text-sm">{notification.title}</h4>
                    {!notification.isRead && (
                      <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{notification.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(notification.createdAt).toLocaleString('en-GB')}
                  </p>
                </div>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    await deleteNotification(notification.id);
                  }}
                  className="text-gray-400 hover:text-red-600"
                >
                  ×
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
