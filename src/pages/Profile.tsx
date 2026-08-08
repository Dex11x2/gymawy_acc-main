import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useDataStore } from '../store/dataStore';
import { Pencil, LogOut, Save, X, Camera, Loader2, CheckCircle2, Clock, MapPin, CalendarX } from 'lucide-react';
import Toast from '../components/Toast';
import api from '../services/api';

const fmtTimeEg = (iso?: string) => {
  if (!iso) return '';
  try { return new Date(iso).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Cairo' }); }
  catch { return ''; }
};
const statusAr = (s?: string): string => ({
  present: 'حاضر', late: 'متأخر', absent: 'غائب', early_leave: 'انصراف مبكر',
  on_leave: 'في أجازة', holiday: 'عطلة', weekend: 'إجازة أسبوعية',
} as Record<string, string>)[s || ''] || (s || '');

// Downscale the picked image to a 256px square JPEG data-URL so the upload
// stays tiny regardless of the original photo size.
const fileToAvatarDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const SIZE = 256;
      const canvas = document.createElement('canvas');
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('canvas'));
      const scale = Math.max(SIZE / img.width, SIZE / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('load')); };
    img.src = url;
  });

const Profile: React.FC = () => {
  const { user, updateUser, logout, setUser } = useAuthStore();
  const { departments } = useDataStore();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // حضور النهاردة (بيظهر في البروفايل إن الشخص سجّل حضوره)
  const [todayAtt, setTodayAtt] = useState<any | undefined>(undefined); // undefined=بيحمّل, null=مفيش تسجيل
  const [myReview, setMyReview] = useState<any | null>(null); // تقييمي (الشهر الحالي + المتوسط)
  const [eom, setEom] = useState<any | null>(null); // موظف الشهر
  useEffect(() => {
    let alive = true;
    api.get('/attendance-records/today')
      .then((res) => { if (alive) setTodayAtt(res.data?.data ?? null); })
      .catch(() => { if (alive) setTodayAtt(null); });
    api.get('/reviews/mine').then((r) => { if (alive) setMyReview(r.data); }).catch(() => {});
    api.get('/employee-of-month').then((r) => { if (alive) setEom(r.data); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const stars = (n: number) => '★★★★★'.slice(0, Math.round(n)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(n));

  const handleAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;
    try {
      setUploadingAvatar(true);
      const avatar = await fileToAvatarDataUrl(file);
      await api.patch('/auth/me/avatar', { avatar });
      setUser({ ...(user as any), avatar });
      setToast({ message: 'تم تحديث صورة البروفايل', type: 'success', isOpen: true });
    } catch {
      setToast({ message: 'فشل رفع الصورة — جرب صورة أخرى', type: 'error', isOpen: true });
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Profile page always renders the LOGGED-IN user's own profile, so no
  // permission gate is needed. Permissions decide cross-user access elsewhere.
  const canEditProfile = true;
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [toast, setToast] = useState<{message: string; type: 'success' | 'error' | 'info' | 'warning'; isOpen: boolean}>({message: '', type: 'success', isOpen: false});

  const [editData, setEditData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    birthDate: (user as any)?.birthDate || '',
    position: (user as any)?.position || '',
    bio: (user as any)?.bio || ''
  });

  const handleSave = async () => {
    if (!user) return;

    try {
      await updateUser(user.id, editData);
      setToast({message: 'تم حفظ التغييرات بنجاح', type: 'success', isOpen: true});
      setIsEditingProfile(false);
      setIsEditingPersonal(false);
    } catch (error) {
      setToast({message: 'فشل حفظ التغييرات', type: 'error', isOpen: true});
    }
  };

  const handleCancel = () => {
    setIsEditingProfile(false);
    setIsEditingPersonal(false);
    setEditData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      birthDate: (user as any)?.birthDate || '',
      position: (user as any)?.position || '',
      bio: (user as any)?.bio || ''
    });
  };

  // Get role display name
  const getRoleDisplay = (role: string) => {
    const roles: Record<string, string> = {
      'dev': 'مدير النظام',
      'general_manager': 'مدير عام',
      'administrative_manager': 'مدير إداري',
      'employee': 'موظف'
    };
    return roles[role] || role;
  };

  // Get avatar URL
  const getAvatarUrl = (name: string) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3B82F6&color=fff&size=200`;
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500 dark:text-gray-400">User not found</p>
      </div>
    );
  }

  // Split name for first/last name display
  const nameParts = user.name.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  return (
    <div className="mx-auto max-w-[970px]">
      {/* Breadcrumb */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">الملف الشخصي</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">بياناتك الشخصية وحالة حضورك</p>
      </div>

      {/* حضور النهاردة */}
      {todayAtt !== undefined && (
        (() => {
          const checkedIn = !!(todayAtt && (todayAtt.hasCheckedIn || todayAtt.checkIn));
          const checkedOut = !!(todayAtt && (todayAtt.hasCheckedOut || todayAtt.checkOut));
          const branch = todayAtt?.branchId?.name;
          if (!checkedIn) {
            return (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
                <div className="flex items-center gap-3">
                  <CalendarX className="h-6 w-6 text-amber-500" />
                  <div>
                    <p className="font-semibold text-amber-800 dark:text-amber-300">لسه مسجّلتش حضورك النهاردة</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400/80">سجّل حضورك عشان يظهر في بروفايلك</p>
                  </div>
                </div>
                <Link to="/attendance-map" className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600">تسجيل الحضور</Link>
              </div>
            );
          }
          return (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                <div>
                  <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                    {checkedOut ? 'سجّلت حضورك وانصرافك النهاردة' : 'سجّلت حضورك النهاردة'} ✅
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-emerald-700 dark:text-emerald-400/90">
                    {todayAtt?.status && <span>{statusAr(todayAtt.status)}</span>}
                    {todayAtt?.checkIn && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> حضور {fmtTimeEg(todayAtt.checkIn)}</span>}
                    {todayAtt?.checkOut && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> انصراف {fmtTimeEg(todayAtt.checkOut)}</span>}
                    {branch && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {branch}</span>}
                  </div>
                </div>
              </div>
              {!checkedOut && (
                <Link to="/attendance-map" className="rounded-lg border border-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/40 dark:text-emerald-300 dark:hover:bg-emerald-500/10">تسجيل الانصراف</Link>
              )}
            </div>
          );
        })()
      )}

      {/* موظف الشهر — يظهر للكل */}
      {eom && (eom.employeeId || eom.employeeName) && (
        <div className={`mb-6 rounded-2xl border p-4 ${eom.isMe
          ? 'border-amber-300 bg-gradient-to-l from-amber-50 to-yellow-50 dark:border-amber-500/40 dark:from-amber-500/10 dark:to-yellow-500/10'
          : 'border-amber-200 bg-amber-50/60 dark:border-amber-500/30 dark:bg-amber-500/5'}`}>
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏆</span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">موظف الشهر</p>
              <p className="font-bold text-gray-900 dark:text-white">
                {eom.isMe ? 'أنت موظف الشهر! مبروك 🎉' : (eom.employeeId?.name || eom.employeeName)}
              </p>
              {eom.reason && <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">{eom.reason}</p>}
            </div>
          </div>
        </div>
      )}

      {/* تقييمي هذا الشهر */}
      {myReview && (myReview.current || myReview.count > 0) && (
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
            <h3 className="font-bold text-gray-900 dark:text-white">تقييم الأداء (هذا الشهر)</h3>
            {myReview.count > 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">المتوسط العام: <b className="text-amber-500">{myReview.average}</b> / 5 · {myReview.count} تقييم</span>
            )}
          </div>
          {myReview.current ? (
            <div>
              <div className="flex items-center gap-2">
                <span className="text-amber-400 text-lg tracking-widest">{stars(myReview.current.rating)}</span>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{myReview.current.rating}/5</span>
              </div>
              {myReview.current.comment && <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{myReview.current.comment}</p>}
              <p className="mt-1 text-xs text-gray-400">بواسطة {myReview.current.reviewerId?.name || 'الإدارة'}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">لسه مفيش تقييم لهذا الشهر.</p>
          )}
        </div>
      )}

      {/* Profile Card */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="p-6 lg:p-8">
          <div className="flex flex-col items-center gap-6 xl:flex-row xl:justify-between">
            {/* User Info */}
            <div className="flex flex-col items-center gap-5 xl:flex-row">
              {/* Avatar */}
              <div className="relative h-[100px] w-[100px] rounded-full">
                <img
                  src={(user as any).avatar || getAvatarUrl(user.name)}
                  alt={user.name}
                  className="h-full w-full rounded-full object-cover"
                />
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  title="تغيير صورة البروفايل"
                  className="absolute bottom-0 start-0 flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-white shadow-lg hover:bg-brand-600 disabled:opacity-60"
                >
                  {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarPick}
                  className="hidden"
                />
              </div>

              {/* Name & Role */}
              <div className="text-center xl:text-start">
                <h4 className="mb-1 text-xl font-semibold text-gray-900 dark:text-white">
                  {user.name}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {(user as any).position || getRoleDisplay(user.role)}
                  {user.departmentId && (
                    <>
                      <span className="mx-2 text-gray-300 dark:text-gray-600">|</span>
                      {departments.find(d => d.id === user.departmentId)?.name || 'القسم'}
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Edit Button */}
            <div className="flex flex-wrap items-center justify-center gap-3 xl:gap-4">
              {canEditProfile && !isEditingProfile && (
                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  <Pencil className="h-4 w-4" />
                  تعديل
                </button>
              )}

              {isEditingProfile && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600"
                  >
                    <Save className="h-4 w-4" />
                    حفظ
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    <X className="h-4 w-4" />
                    إلغاء
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Personal Information Section */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-6 py-5 dark:border-gray-800 lg:px-8">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">المعلومات الشخصية</h4>
          {canEditProfile && !isEditingPersonal && (
            <button
              onClick={() => setIsEditingPersonal(true)}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <Pencil className="h-4 w-4" />
              تعديل
            </button>
          )}
          {isEditingPersonal && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
              >
                <Save className="h-4 w-4" />
                حفظ
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <X className="h-4 w-4" />
                إلغاء
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 lg:p-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* First Name */}
            <div>
              <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">الاسم الأول</p>
              {isEditingPersonal ? (
                <input
                  type="text"
                  value={editData.name.split(' ')[0] || ''}
                  onChange={(e) => {
                    const newFirstName = e.target.value;
                    const lastName = editData.name.split(' ').slice(1).join(' ');
                    setEditData({ ...editData, name: `${newFirstName} ${lastName}`.trim() });
                  }}
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="الاسم الأول"
                />
              ) : (
                <p className="text-base font-medium text-gray-900 dark:text-white">{firstName || '-'}</p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">اسم العائلة</p>
              {isEditingPersonal ? (
                <input
                  type="text"
                  value={editData.name.split(' ').slice(1).join(' ') || ''}
                  onChange={(e) => {
                    const firstName = editData.name.split(' ')[0] || '';
                    const newLastName = e.target.value;
                    setEditData({ ...editData, name: `${firstName} ${newLastName}`.trim() });
                  }}
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="اسم العائلة"
                />
              ) : (
                <p className="text-base font-medium text-gray-900 dark:text-white">{lastName || '-'}</p>
              )}
            </div>

            {/* Email Address */}
            <div>
              <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">البريد الإلكتروني</p>
              {isEditingPersonal ? (
                <input
                  type="email"
                  value={editData.email}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="البريد الإلكتروني"
                />
              ) : (
                <p className="text-base font-medium text-gray-900 dark:text-white break-words">{user.email || '-'}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">رقم الهاتف</p>
              {isEditingPersonal ? (
                <input
                  type="tel"
                  value={editData.phone}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="رقم الهاتف"
                />
              ) : (
                <p className="text-base font-medium text-gray-900 dark:text-white" dir="ltr">{user.phone || '-'}</p>
              )}
            </div>

            {/* Bio */}
            <div className="md:col-span-2">
              <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">نبذة</p>
              {isEditingPersonal ? (
                <textarea
                  value={editData.bio}
                  onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="اكتب نبذة عن نفسك..."
                />
              ) : (
                <p className="text-base font-medium text-gray-900 dark:text-white">
                  {(user as any).bio || (user as any).position || getRoleDisplay(user.role)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Account Actions */}
      <div className="mt-6">
        <button
          onClick={logout}
          className="flex items-center gap-2 rounded-lg border border-rose-300 px-4 py-2.5 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-500 hover:text-white hover:border-rose-500 dark:border-rose-500/40 dark:text-rose-400"
        >
          <LogOut className="h-4 w-4" />
          تسجيل الخروج
        </button>
      </div>

      {/* Toast */}
      <Toast
        message={toast.message}
        type={toast.type}
        isOpen={toast.isOpen}
        onClose={() => setToast({...toast, isOpen: false})}
      />
    </div>
  );
};

export default Profile;
