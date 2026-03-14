import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { useDataStore } from '../store/dataStore';
import { useSettingsStore } from '../store/settingsStore';
import { ContentAccount, ContentItem, ContentType, ContentPlatform, ContentStatus } from '../types';
import api from '../services/api';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { Card, Badge, Button, Input, Textarea } from '../components/ui';
import {
  Plus, ChevronLeft, ChevronRight, Calendar, Film, Coffee,
  Megaphone, Video, FileText, Radio, ExternalLink, Check,
  Edit2, Trash2, Copy, Users, Link2, X, Save, FolderPlus
} from 'lucide-react';

// ========== Constants ==========

const CONTENT_TYPES: { value: ContentType; labelAr: string; labelEn: string; color: string }[] = [
  { value: 'reel', labelAr: 'ريل', labelEn: 'Reel', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  { value: 'post', labelAr: 'بوست', labelEn: 'Post', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  { value: 'podcast', labelAr: 'بودكاست', labelEn: 'Podcast', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  { value: 'long_video', labelAr: 'فيديو طويل', labelEn: 'Long Video', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  { value: 'ad', labelAr: 'اعلان', labelEn: 'Ad', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  { value: 'rest', labelAr: 'راحه', labelEn: 'Rest', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
  { value: 'other', labelAr: 'أخرى', labelEn: 'Other', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200' },
];

const PLATFORMS: { value: ContentPlatform; labelAr: string; labelEn: string; color: string }[] = [
  { value: 'youtube', labelAr: 'يوتيوب', labelEn: 'YouTube', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200' },
  { value: 'tiktok', labelAr: 'تيك توك', labelEn: 'TikTok', color: 'bg-gray-900 text-white dark:bg-gray-600' },
  { value: 'instagram', labelAr: 'انستجرام', labelEn: 'Instagram', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-200' },
  { value: 'facebook', labelAr: 'فيس بوك', labelEn: 'Facebook', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' },
  { value: 'twitter', labelAr: 'تويتر', labelEn: 'Twitter', color: 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-200' },
];

const STATUSES: { value: ContentStatus; labelAr: string; labelEn: string; color: string }[] = [
  { value: 'open', labelAr: 'مفتوح', labelEn: 'Open', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' },
  { value: 'in_progress', labelAr: 'قيد التنفيذ', labelEn: 'In Progress', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  { value: 'done', labelAr: 'تم', labelEn: 'Done', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  { value: 'published', labelAr: 'منشور', labelEn: 'Published', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
];

// ========== Helper functions ==========

const getContentTypeInfo = (type: ContentType) => CONTENT_TYPES.find(t => t.value === type) || CONTENT_TYPES[6];
const getPlatformInfo = (platform: ContentPlatform) => PLATFORMS.find(p => p.value === platform);
const getStatusInfo = (status: ContentStatus) => STATUSES.find(s => s.value === status) || STATUSES[0];

const getDaysInMonth = (month: number, year: number) => new Date(year, month, 0).getDate();

const formatDate = (date: Date) => {
  const d = new Date(date);
  return `${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' })} ${d.getFullYear()}`;
};

const MONTH_NAMES_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const MONTH_NAMES_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// ========== Main Component ==========

const ContentCalendar: React.FC = () => {
  const { user } = useAuthStore();
  const { employees, loadEmployees } = useDataStore();
  const { language } = useSettingsStore();
  const isAr = language === 'ar';

  // State
  const [accounts, setAccounts] = useState<ContentAccount[]>([]);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string>('');
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; isOpen: boolean }>({ message: '', type: 'success', isOpen: false });

  // Form state for content item
  const [itemForm, setItemForm] = useState({
    title: '',
    contentType: 'reel' as ContentType,
    publishDate: '',
    publishTime: '22:00',
    dueDate: '',
    videoLink: '',
    footageLink: '',
    script: '',
    platforms: [] as ContentPlatform[],
    assignedTo: [] as string[],
    collaborators: '',
    notes: '',
    campaignCategory: '',
    status: 'open' as ContentStatus,
  });

  // Form state for account
  const [accountForm, setAccountForm] = useState({ name: '', description: '' });

  // ========== Data Loading ==========

  const loadAccounts = useCallback(async () => {
    try {
      const res = await api.get('/content/accounts');
      setAccounts(res.data);
      if (res.data.length > 0 && !activeAccountId) {
        setActiveAccountId(res.data[0]._id || res.data[0].id);
      }
    } catch (err) {
      console.error('Error loading accounts:', err);
    }
  }, [activeAccountId]);

  const loadItems = useCallback(async () => {
    if (!activeAccountId) return;
    setIsLoading(true);
    try {
      const res = await api.get(`/content/items?accountId=${activeAccountId}&month=${currentMonth}&year=${currentYear}`);
      setItems(res.data);
    } catch (err) {
      console.error('Error loading items:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeAccountId, currentMonth, currentYear]);

  useEffect(() => {
    if (user) {
      loadAccounts();
      loadEmployees();
    }
  }, [user, loadAccounts, loadEmployees]);

  useEffect(() => {
    if (activeAccountId) loadItems();
  }, [activeAccountId, loadItems]);

  // ========== Handlers ==========

  const handleMonthNav = (direction: number) => {
    let newMonth = currentMonth + direction;
    let newYear = currentYear;
    if (newMonth > 12) { newMonth = 1; newYear++; }
    if (newMonth < 1) { newMonth = 12; newYear--; }
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
  };

  const openCreateItem = (day?: number) => {
    const dateStr = day
      ? `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      : '';
    setItemForm({
      title: '', contentType: 'reel', publishDate: dateStr, publishTime: '22:00',
      dueDate: '', videoLink: '', footageLink: '', script: '',
      platforms: [], assignedTo: [], collaborators: '', notes: '',
      campaignCategory: '', status: 'open',
    });
    setEditingItem(null);
    setShowItemModal(true);
  };

  const openEditItem = (item: ContentItem) => {
    const pubDate = new Date(item.publishDate);
    setItemForm({
      title: item.title,
      contentType: item.contentType,
      publishDate: pubDate.toISOString().split('T')[0],
      publishTime: `${String(pubDate.getHours()).padStart(2, '0')}:${String(pubDate.getMinutes()).padStart(2, '0')}`,
      dueDate: item.dueDate ? new Date(item.dueDate).toISOString().split('T')[0] : '',
      videoLink: item.videoLink || '',
      footageLink: item.footageLink || '',
      script: item.script || '',
      platforms: item.platforms,
      assignedTo: item.assignedTo.map((a: any) => a._id || a),
      collaborators: item.collaborators || '',
      notes: item.notes || '',
      campaignCategory: item.campaignCategory || '',
      status: item.status,
    });
    setEditingItem(item);
    setShowItemModal(true);
  };

  const handleSaveItem = async () => {
    try {
      const publishDateTime = new Date(`${itemForm.publishDate}T${itemForm.publishTime}:00`);
      const payload = {
        accountId: activeAccountId,
        title: itemForm.title,
        contentType: itemForm.contentType,
        publishDate: publishDateTime.toISOString(),
        dueDate: itemForm.dueDate || undefined,
        videoLink: itemForm.videoLink || undefined,
        footageLink: itemForm.footageLink || undefined,
        script: itemForm.script || undefined,
        platforms: itemForm.platforms,
        assignedTo: itemForm.assignedTo,
        collaborators: itemForm.collaborators || undefined,
        notes: itemForm.notes || undefined,
        campaignCategory: itemForm.campaignCategory || undefined,
        status: itemForm.status,
        isDone: itemForm.status === 'done' || itemForm.status === 'published',
      };

      if (editingItem) {
        await api.put(`/content/items/${editingItem._id || editingItem.id}`, payload);
        setToast({ message: isAr ? 'تم تحديث المحتوى بنجاح' : 'Content updated', type: 'success', isOpen: true });
      } else {
        await api.post('/content/items', payload);
        setToast({ message: isAr ? 'تم إضافة المحتوى بنجاح' : 'Content added', type: 'success', isOpen: true });
      }
      setShowItemModal(false);
      loadItems();
    } catch (err) {
      setToast({ message: isAr ? 'حدث خطأ' : 'Error saving', type: 'error', isOpen: true });
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm(isAr ? 'هل أنت متأكد من الحذف؟' : 'Are you sure?')) return;
    try {
      await api.delete(`/content/items/${id}`);
      setToast({ message: isAr ? 'تم الحذف' : 'Deleted', type: 'success', isOpen: true });
      loadItems();
    } catch (err) {
      setToast({ message: isAr ? 'حدث خطأ' : 'Error', type: 'error', isOpen: true });
    }
  };

  const handleToggleDone = async (item: ContentItem) => {
    const newDone = !item.isDone;
    const newStatus = newDone ? 'done' : 'open';
    try {
      await api.put(`/content/items/${item._id || item.id}`, { isDone: newDone, status: newStatus });
      loadItems();
    } catch (err) {
      setToast({ message: isAr ? 'حدث خطأ' : 'Error', type: 'error', isOpen: true });
    }
  };

  const handleSaveAccount = async () => {
    try {
      if (!accountForm.name.trim()) return;
      await api.post('/content/accounts', accountForm);
      setToast({ message: isAr ? 'تم إنشاء الحساب بنجاح' : 'Account created', type: 'success', isOpen: true });
      setShowAccountModal(false);
      setAccountForm({ name: '', description: '' });
      loadAccounts();
    } catch (err) {
      setToast({ message: isAr ? 'حدث خطأ' : 'Error', type: 'error', isOpen: true });
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm(isAr ? 'هل أنت متأكد من حذف هذا الحساب؟' : 'Delete this account?')) return;
    try {
      await api.delete(`/content/accounts/${id}`);
      setToast({ message: isAr ? 'تم الحذف' : 'Deleted', type: 'success', isOpen: true });
      if (activeAccountId === id) setActiveAccountId('');
      loadAccounts();
    } catch (err) {
      setToast({ message: isAr ? 'حدث خطأ' : 'Error', type: 'error', isOpen: true });
    }
  };

  const togglePlatform = (platform: ContentPlatform) => {
    setItemForm(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform]
    }));
  };

  const toggleAssignee = (empId: string) => {
    setItemForm(prev => ({
      ...prev,
      assignedTo: prev.assignedTo.includes(empId)
        ? prev.assignedTo.filter(id => id !== empId)
        : [...prev.assignedTo, empId]
    }));
  };

  // ========== Generate calendar rows ==========

  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const getItemForDay = (day: number): ContentItem | undefined => {
    return items.find(item => {
      const d = new Date(item.publishDate);
      return d.getDate() === day;
    });
  };

  const getItemsForDay = (day: number): ContentItem[] => {
    return items.filter(item => {
      const d = new Date(item.publishDate);
      return d.getDate() === day;
    });
  };

  // ========== Render ==========

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isAr ? 'تقويم المحتوى' : 'Content Calendar'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isAr ? 'إدارة وجدولة المحتوى عبر المنصات المختلفة' : 'Manage and schedule content across platforms'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowAccountModal(true)}
            className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
          >
            <FolderPlus size={18} />
            {isAr ? 'حساب جديد' : 'New Account'}
          </Button>
          <Button
            onClick={() => openCreateItem()}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg"
          >
            <Plus size={18} />
            {isAr ? 'محتوى جديد' : 'New Content'}
          </Button>
        </div>
      </div>

      {/* Account Tabs */}
      {accounts.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {accounts.map(acc => (
            <button
              key={acc._id || acc.id}
              onClick={() => setActiveAccountId(acc._id || acc.id)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all
                ${(acc._id || acc.id) === activeAccountId
                  ? 'bg-brand-500 text-white shadow-md'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-brand-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'}
              `}
            >
              {acc.name}
            </button>
          ))}
        </div>
      )}

      {accounts.length === 0 && (
        <Card className="p-8 text-center">
          <FolderPlus size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
            {isAr ? 'لا توجد حسابات محتوى' : 'No content accounts'}
          </h3>
          <p className="text-gray-500 mb-4">
            {isAr ? 'أنشئ حساب محتوى لبدء إضافة المحتوى' : 'Create an account to start adding content'}
          </p>
          <Button
            onClick={() => setShowAccountModal(true)}
            className="bg-brand-500 hover:bg-brand-600 text-white px-6 py-2 rounded-lg"
          >
            {isAr ? 'إنشاء حساب' : 'Create Account'}
          </Button>
        </Card>
      )}

      {/* Month Navigation */}
      {activeAccountId && (
        <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <button onClick={() => handleMonthNav(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            {isAr ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-brand-500" />
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              {isAr ? MONTH_NAMES_AR[currentMonth - 1] : MONTH_NAMES_EN[currentMonth - 1]} {currentYear}
            </span>
          </div>
          <button onClick={() => handleMonthNav(1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            {isAr ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>
      )}

      {/* Content Table */}
      {activeAccountId && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-12 gap-0 bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700 px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
            <div className="col-span-3">{isAr ? 'اسم الفيديو' : 'Title'}</div>
            <div className="col-span-1 text-center">{isAr ? 'النوع' : 'Type'}</div>
            <div className="col-span-1 text-center">{isAr ? 'الحالة' : 'Status'}</div>
            <div className="col-span-2 text-center">{isAr ? 'تاريخ النشر' : 'Publish Date'}</div>
            <div className="col-span-1 text-center">{isAr ? 'الرابط' : 'Link'}</div>
            <div className="col-span-2 text-center">{isAr ? 'المنصات' : 'Platforms'}</div>
            <div className="col-span-1 text-center">{isAr ? 'المسؤول' : 'Assignee'}</div>
            <div className="col-span-1 text-center">{isAr ? 'إجراءات' : 'Actions'}</div>
          </div>

          {/* Calendar Rows */}
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">
                <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full mx-auto mb-2" />
                {isAr ? 'جاري التحميل...' : 'Loading...'}
              </div>
            ) : (
              calendarDays.map(day => {
                const dayItems = getItemsForDay(day);
                const dayDate = new Date(currentYear, currentMonth - 1, day);
                const dayName = dayDate.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { weekday: 'short' });
                const isToday = new Date().getDate() === day &&
                  new Date().getMonth() + 1 === currentMonth &&
                  new Date().getFullYear() === currentYear;

                if (dayItems.length === 0) {
                  // Empty day row - clickable to add
                  return (
                    <div
                      key={day}
                      onClick={() => openCreateItem(day)}
                      className={`
                        grid grid-cols-12 gap-0 px-4 py-3 cursor-pointer
                        hover:bg-brand-50 dark:hover:bg-gray-750 transition-colors
                        ${isToday ? 'bg-brand-50/50 dark:bg-brand-900/10' : ''}
                      `}
                    >
                      <div className="col-span-3 flex items-center gap-2">
                        <span className={`
                          inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                          ${isToday ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}
                        `}>
                          {day}
                        </span>
                        <span className="text-xs text-gray-400">{dayName}</span>
                      </div>
                      <div className="col-span-9 flex items-center">
                        <span className="text-xs text-gray-400">
                          <Plus size={14} className="inline" /> {isAr ? 'اضغط لإضافة محتوى' : 'Click to add content'}
                        </span>
                      </div>
                    </div>
                  );
                }

                return dayItems.map((item, idx) => {
                  const typeInfo = getContentTypeInfo(item.contentType);
                  const statusInfo = getStatusInfo(item.status);
                  const isRest = item.contentType === 'rest';

                  return (
                    <div
                      key={`${day}-${idx}`}
                      className={`
                        grid grid-cols-12 gap-0 px-4 py-3 transition-colors
                        ${isToday ? 'bg-brand-50/50 dark:bg-brand-900/10' : ''}
                        ${isRest ? 'bg-gray-50 dark:bg-gray-800/50' : ''}
                        ${item.isDone ? 'opacity-75' : ''}
                        hover:bg-gray-50 dark:hover:bg-gray-750
                      `}
                    >
                      {/* Title + Day */}
                      <div className="col-span-3 flex items-center gap-2 min-w-0">
                        {idx === 0 && (
                          <span className={`
                            inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium flex-shrink-0
                            ${isToday ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}
                          `}>
                            {day}
                          </span>
                        )}
                        {idx > 0 && <span className="w-8 flex-shrink-0" />}
                        <span className={`truncate text-sm ${isRest ? 'text-gray-400 italic' : 'text-gray-900 dark:text-white font-medium'}`}>
                          {item.title || (isRest ? (isAr ? 'راحه' : 'Rest') : '')}
                        </span>
                      </div>

                      {/* Content Type */}
                      <div className="col-span-1 flex items-center justify-center">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${typeInfo.color}`}>
                          {isAr ? typeInfo.labelAr : typeInfo.labelEn}
                        </span>
                      </div>

                      {/* Status */}
                      <div className="col-span-1 flex items-center justify-center">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${statusInfo.color}`}>
                          {isAr ? statusInfo.labelAr : statusInfo.labelEn}
                        </span>
                      </div>

                      {/* Publish Date */}
                      <div className="col-span-2 flex items-center justify-center text-xs text-gray-600 dark:text-gray-400">
                        {formatDate(new Date(item.publishDate))}
                        <span className="mr-1 ml-1">
                          {new Date(item.publishDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </span>
                      </div>

                      {/* Video Link */}
                      <div className="col-span-1 flex items-center justify-center">
                        {item.videoLink ? (
                          <a
                            href={item.videoLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-700"
                            onClick={e => e.stopPropagation()}
                          >
                            <ExternalLink size={16} />
                          </a>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </div>

                      {/* Platforms */}
                      <div className="col-span-2 flex items-center justify-center gap-1 flex-wrap">
                        {item.platforms.map(p => {
                          const pInfo = getPlatformInfo(p);
                          return pInfo ? (
                            <span key={p} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${pInfo.color}`}>
                              {isAr ? pInfo.labelAr : pInfo.labelEn}
                            </span>
                          ) : null;
                        })}
                      </div>

                      {/* Assignee */}
                      <div className="col-span-1 flex items-center justify-center">
                        {Array.isArray(item.assignedTo) && item.assignedTo.length > 0 ? (
                          <div className="flex items-center gap-1">
                            {item.assignedTo.slice(0, 2).map((a: any, i: number) => (
                              <span key={i} className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-200 text-[10px] font-medium" title={a.name || ''}>
                                {(a.name || '?').charAt(0)}
                              </span>
                            ))}
                            {item.assignedTo.length > 2 && (
                              <span className="text-[10px] text-gray-400">+{item.assignedTo.length - 2}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="col-span-1 flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleToggleDone(item)}
                          className={`p-1 rounded ${item.isDone ? 'text-green-500 bg-green-50 dark:bg-green-900/30' : 'text-gray-400 hover:text-green-500'}`}
                          title={item.isDone ? (isAr ? 'تم' : 'Done') : (isAr ? 'تحديد كمنتهي' : 'Mark done')}
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => openEditItem(item)}
                          className="p-1 rounded text-gray-400 hover:text-blue-500"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item._id || item.id)}
                          className="p-1 rounded text-gray-400 hover:text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                });
              })
            )}
          </div>

          {/* Summary Footer */}
          <div className="bg-gray-50 dark:bg-gray-750 border-t border-gray-200 dark:border-gray-700 px-4 py-3 flex flex-wrap gap-4 text-xs text-gray-500">
            <span>{isAr ? 'إجمالي المحتوى' : 'Total content'}: <b>{items.filter(i => i.contentType !== 'rest').length}</b></span>
            <span>{isAr ? 'أيام الراحة' : 'Rest days'}: <b>{items.filter(i => i.contentType === 'rest').length}</b></span>
            <span>{isAr ? 'تم الانتهاء' : 'Completed'}: <b>{items.filter(i => i.isDone).length}</b></span>
            <span>{isAr ? 'متبقي' : 'Remaining'}: <b>{items.filter(i => !i.isDone && i.contentType !== 'rest').length}</b></span>
          </div>
        </div>
      )}

      {/* ========== Item Modal ========== */}
      <Modal
        isOpen={showItemModal}
        onClose={() => setShowItemModal(false)}
        title={editingItem ? (isAr ? 'تعديل المحتوى' : 'Edit Content') : (isAr ? 'إضافة محتوى جديد' : 'New Content')}
        size="lg"
      >
          <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  {isAr ? 'العنوان' : 'Title'}
                </label>
                <Input
                  value={itemForm.title}
                  onChange={(e: any) => setItemForm(p => ({ ...p, title: e.target.value }))}
                  placeholder={isAr ? 'اسم الفيديو / المحتوى' : 'Content title'}
                />
              </div>

              {/* Content Type */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  {isAr ? 'نوع المحتوى' : 'Content Type'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {CONTENT_TYPES.map(ct => (
                    <button
                      key={ct.value}
                      onClick={() => setItemForm(p => ({ ...p, contentType: ct.value }))}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        itemForm.contentType === ct.value
                          ? ct.color + ' ring-2 ring-offset-1 ring-brand-500'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {isAr ? ct.labelAr : ct.labelEn}
                    </button>
                  ))}
                </div>
              </div>

              {/* Publish Date + Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                    {isAr ? 'تاريخ النشر' : 'Publish Date'}
                  </label>
                  <Input
                    type="date"
                    value={itemForm.publishDate}
                    onChange={(e: any) => setItemForm(p => ({ ...p, publishDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                    {isAr ? 'وقت النشر' : 'Publish Time'}
                  </label>
                  <Input
                    type="time"
                    value={itemForm.publishTime}
                    onChange={(e: any) => setItemForm(p => ({ ...p, publishTime: e.target.value }))}
                  />
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  {isAr ? 'تاريخ التسليم' : 'Due Date'}
                </label>
                <Input
                  type="date"
                  value={itemForm.dueDate}
                  onChange={(e: any) => setItemForm(p => ({ ...p, dueDate: e.target.value }))}
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  {isAr ? 'الحالة' : 'Status'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map(s => (
                    <button
                      key={s.value}
                      onClick={() => setItemForm(p => ({ ...p, status: s.value }))}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        itemForm.status === s.value
                          ? s.color + ' ring-2 ring-offset-1 ring-brand-500'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {isAr ? s.labelAr : s.labelEn}
                    </button>
                  ))}
                </div>
              </div>

              {/* Platforms */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  {isAr ? 'المنصات' : 'Platforms'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map(p => (
                    <button
                      key={p.value}
                      onClick={() => togglePlatform(p.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        itemForm.platforms.includes(p.value)
                          ? p.color + ' ring-2 ring-offset-1 ring-brand-500'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {isAr ? p.labelAr : p.labelEn}
                    </button>
                  ))}
                </div>
              </div>

              {/* Video Link */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  {isAr ? 'رابط الفيديو' : 'Video Link'}
                </label>
                <Input
                  value={itemForm.videoLink}
                  onChange={(e: any) => setItemForm(p => ({ ...p, videoLink: e.target.value }))}
                  placeholder="https://drive.google.com/..."
                  dir="ltr"
                />
              </div>

              {/* Footage Link */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  {isAr ? 'رابط المادة الخام' : 'Footage Link'}
                </label>
                <Input
                  value={itemForm.footageLink}
                  onChange={(e: any) => setItemForm(p => ({ ...p, footageLink: e.target.value }))}
                  placeholder="https://..."
                  dir="ltr"
                />
              </div>

              {/* Script */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  {isAr ? 'السكريبت' : 'Script'}
                </label>
                <Textarea
                  value={itemForm.script}
                  onChange={(e: any) => setItemForm(p => ({ ...p, script: e.target.value }))}
                  rows={3}
                  placeholder={isAr ? 'نص السكريبت...' : 'Script text...'}
                />
              </div>

              {/* Assigned To */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  {isAr ? 'الموظفين المسؤولين' : 'Assigned Employees'}
                </label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded-lg dark:border-gray-600">
                  {employees.map(emp => (
                    <button
                      key={emp.id}
                      onClick={() => toggleAssignee(emp.id)}
                      className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${
                        itemForm.assignedTo.includes(emp.id)
                          ? 'bg-brand-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {emp.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Collaborators */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  {isAr ? 'المتعاونين الخارجيين' : 'External Collaborators'}
                </label>
                <Input
                  value={itemForm.collaborators}
                  onChange={(e: any) => setItemForm(p => ({ ...p, collaborators: e.target.value }))}
                  placeholder={isAr ? 'أسماء المتعاونين' : 'Collaborator names'}
                />
              </div>

              {/* Campaign Category (only for ads) */}
              {itemForm.contentType === 'ad' && (
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                    {isAr ? 'فئة الحملة' : 'Campaign Category'}
                  </label>
                  <Input
                    value={itemForm.campaignCategory}
                    onChange={(e: any) => setItemForm(p => ({ ...p, campaignCategory: e.target.value }))}
                    placeholder={isAr ? 'نوع الحملة الإعلانية' : 'Campaign type'}
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  {isAr ? 'ملاحظات' : 'Notes'}
                </label>
                <Textarea
                  value={itemForm.notes}
                  onChange={(e: any) => setItemForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  placeholder={isAr ? 'ملاحظات إضافية...' : 'Additional notes...'}
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t dark:border-gray-700">
              <Button
                onClick={() => setShowItemModal(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                onClick={handleSaveItem}
                className="px-6 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg flex items-center gap-2"
              >
                <Save size={16} />
                {editingItem ? (isAr ? 'حفظ التعديلات' : 'Save Changes') : (isAr ? 'إضافة' : 'Add')}
              </Button>
            </div>
        </Modal>

      {/* ========== Account Modal ========== */}
      <Modal
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        title={isAr ? 'حساب محتوى جديد' : 'New Content Account'}
      >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  {isAr ? 'اسم الحساب' : 'Account Name'}
                </label>
                <Input
                  value={accountForm.name}
                  onChange={(e: any) => setAccountForm(p => ({ ...p, name: e.target.value }))}
                  placeholder={isAr ? 'مثال: Yusuf, Gymmawy, Gymmawyia' : 'e.g., Yusuf, Gymmawy'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  {isAr ? 'الوصف' : 'Description'}
                </label>
                <Textarea
                  value={accountForm.description}
                  onChange={(e: any) => setAccountForm(p => ({ ...p, description: e.target.value }))}
                  rows={2}
                  placeholder={isAr ? 'وصف اختياري...' : 'Optional description...'}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t dark:border-gray-700">
              <Button
                onClick={() => setShowAccountModal(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                onClick={handleSaveAccount}
                className="px-6 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg"
              >
                {isAr ? 'إنشاء' : 'Create'}
              </Button>
            </div>
        </Modal>

      {/* Toast */}
      <Toast
        message={toast.message}
        type={toast.type}
        isOpen={toast.isOpen}
        onClose={() => setToast(p => ({ ...p, isOpen: false }))}
      />
    </div>
  );
};

export default ContentCalendar;
