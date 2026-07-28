import React from 'react';
import { useNotificationStore } from '../store/notificationStore';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { isSoundEnabled, setSoundEnabled, playNotificationSound, primeNotificationSound, getMutedTypes, setTypeMuted } from '../utils/notificationSound';
import { Volume2, VolumeX, CheckCheck, Bell, X, ChevronLeft, SlidersHorizontal } from 'lucide-react';

const MUTE_TYPES: Array<{ key: string; label: string; icon: string }> = [
  { key: 'message', label: 'الرسائل', icon: '💬' },
  { key: 'task', label: 'المهام', icon: '📋' },
  { key: 'post', label: 'المنشورات', icon: '📢' },
  { key: 'complaint', label: 'الشكاوى', icon: '⚠️' },
  { key: 'review', label: 'التقييمات', icon: '⭐' },
  { key: 'attendance', label: 'الحضور', icon: '📅' },
  { key: 'payment', label: 'الرواتب والمدفوعات', icon: '💰' },
  { key: 'video_review', label: 'مراجعة الفيديو', icon: '🎬' },
];

// نمط لكل نوع إشعار: أيقونة + ألوان
const typeStyles: Record<string, { icon: string; ring: string; chip: string }> = {
  message:      { icon: '💬', ring: 'bg-blue-500',    chip: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300' },
  task:         { icon: '📋', ring: 'bg-brand-500',   chip: 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300' },
  post:         { icon: '📢', ring: 'bg-brand-500',   chip: 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300' },
  payroll:      { icon: '💵', ring: 'bg-success-500', chip: 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-300' },
  payment:      { icon: '💰', ring: 'bg-success-500', chip: 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-300' },
  approval:     { icon: '✅', ring: 'bg-success-500', chip: 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-300' },
  review:       { icon: '⭐', ring: 'bg-warning-500', chip: 'bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-300' },
  complaint:    { icon: '⚠️', ring: 'bg-warning-500', chip: 'bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-300' },
  attendance:   { icon: '📅', ring: 'bg-blue-500',    chip: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300' },
  video_review: { icon: '🎬', ring: 'bg-purple-500',  chip: 'bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-300' },
  general:      { icon: '🔔', ring: 'bg-brand-500',   chip: 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300' },
  system:       { icon: '⚙️', ring: 'bg-gray-400',    chip: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300' },
};

const timeAgo = (d: Date | string): string => {
  const date = new Date(d);
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 45) return 'الآن';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} ساعة`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `منذ ${days} يوم`;
  return date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
};

export const NotificationPanel: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const { getUserNotifications, markAllAsRead, markAsRead, deleteNotification } = useNotificationStore();
  const navigate = useNavigate();
  const [soundOn, setSoundOn] = React.useState(isSoundEnabled());
  const [showSettings, setShowSettings] = React.useState(false);
  const [muted, setMuted] = React.useState<string[]>(getMutedTypes());

  const toggleMuted = (key: string) => {
    const next = !muted.includes(key);
    setTypeMuted(key, next);
    setMuted(getMutedTypes());
  };

  const toggleSound = () => {
    primeNotificationSound();
    const next = !soundOn;
    setSoundEnabled(next);
    setSoundOn(next);
    if (next) playNotificationSound();
  };

  const notifications = getUserNotifications(user?.id || '');
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleNotificationClick = async (notification: any) => {
    if (!notification.isRead) {
      try { await markAsRead(notification.id); } catch { /* ignore */ }
    }
    onClose();
    if (notification.link) navigate(notification.link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-2 top-20 w-auto sm:absolute sm:inset-x-auto sm:end-0 sm:top-16 sm:w-[26rem] sm:max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2 bg-gradient-to-l from-brand-50/60 to-transparent dark:from-brand-500/10">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-gray-800 dark:text-white leading-tight">الإشعارات</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
              {unreadCount > 0 ? `${unreadCount} غير مقروء` : 'كل الإشعارات مقروءة'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleSound}
            title={soundOn ? 'إيقاف صوت الإشعارات' : 'تشغيل صوت الإشعارات'}
            className={`p-2 rounded-lg transition-colors border ${
              soundOn
                ? 'bg-brand-50 text-brand-600 border-brand-200 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400 dark:border-brand-500/30'
                : 'bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600'
            }`}
          >
            {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setShowSettings((s) => !s)}
            title="تخصيص الإشعارات"
            className={`p-2 rounded-lg transition-colors border ${
              showSettings
                ? 'bg-brand-50 text-brand-600 border-brand-200 dark:bg-brand-500/10 dark:text-brand-400 dark:border-brand-500/30'
                : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsRead(user?.id || '')}
              title="تعليم الكل كمقروء"
              className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 transition-colors"
            >
              <CheckCheck className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Settings: mute per type */}
      {showSettings && (
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/30">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">كتم صوت أنواع معيّنة</p>
          <div className="grid grid-cols-2 gap-1.5">
            {MUTE_TYPES.map((t) => {
              const isMuted = muted.includes(t.key);
              return (
                <button
                  key={t.key}
                  onClick={() => toggleMuted(t.key)}
                  className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-sm border transition-colors ${
                    isMuted
                      ? 'bg-gray-100 text-gray-400 border-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:border-gray-700'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600'
                  }`}
                >
                  <span className="flex items-center gap-1.5 truncate"><span>{t.icon}</span>{t.label}</span>
                  {isMuted ? <VolumeX className="h-3.5 w-3.5 shrink-0" /> : <Volume2 className="h-3.5 w-3.5 shrink-0 text-brand-500" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* List */}
      <div className="max-h-[70vh] sm:max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-700/60 flex items-center justify-center">
              <Bell className="h-7 w-7 text-gray-400" />
            </div>
            <p className="text-gray-600 dark:text-gray-300 font-medium">لا توجد إشعارات</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">هيظهر هنا أي تحديث أو رسالة جديدة</p>
          </div>
        ) : (
          notifications.map((notification) => {
            const style = typeStyles[notification.type] || typeStyles.system;
            return (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`group relative flex items-start gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-700/60 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/40 ${
                  !notification.isRead ? 'bg-brand-50/40 dark:bg-brand-500/5' : ''
                }`}
              >
                {/* Unread accent */}
                {!notification.isRead && (
                  <span className="absolute inset-y-0 start-0 w-1 bg-brand-500 rounded-e-full" />
                )}

                {/* Icon chip */}
                <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg ${style.chip}`}>
                  {style.icon}
                </div>

                {/* Body */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className={`text-sm truncate ${!notification.isRead ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-200'}`}>
                      {notification.title}
                    </h4>
                    {!notification.isRead && <span className="shrink-0 w-2 h-2 bg-brand-500 rounded-full" />}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2 break-words">{notification.message}</p>
                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-400 dark:text-gray-500">
                    <span>{timeAgo(notification.createdAt)}</span>
                    {notification.link && (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-0.5 text-brand-500 dark:text-brand-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          فتح <ChevronLeft className="h-3 w-3" />
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Delete */}
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    await deleteNotification(notification.id);
                  }}
                  title="حذف"
                  className="shrink-0 p-1.5 rounded-lg text-gray-300 hover:text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
