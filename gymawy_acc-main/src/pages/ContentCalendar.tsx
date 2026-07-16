import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { usePermissions } from '../hooks/usePermissions';
import { calendarApi, CalMonth, personName } from '../services/contentCalendar';
import { MONTH_ICON_COLORS } from '../config/contentCalendar';
import { Avatar } from '../components/ui';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Toast from '../components/Toast';
import { Plus, ChevronDown, ChevronLeft, CheckCircle2, RotateCcw, Trash2, CalendarDays, Lock } from 'lucide-react';

const ContentCalendar: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { canRead, canWrite, canDelete } = usePermissions();
  const canView = canRead('content_calendar');
  const canEdit = canWrite('content_calendar');
  const canRemove = canDelete('content_calendar');

  const [months, setMonths] = useState<CalMonth[]>([]);
  const [loading, setLoading] = useState(true);
  const [doneOpen, setDoneOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isOpen: boolean }>({ message: '', type: 'success', isOpen: false });

  const now = new Date();
  const [form, setForm] = useState({ month: now.getMonth() + 1, year: now.getFullYear(), iconColor: MONTH_ICON_COLORS[0] });

  const notify = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type, isOpen: true });

  const load = async () => {
    try {
      setLoading(true);
      const data = await calendarApi.getMonths();
      setMonths(data);
    } catch (e: any) {
      notify(e?.response?.data?.message || 'فشل تحميل الشهور', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canView) load();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdd = async () => {
    try {
      const created = await calendarApi.createMonth(form);
      setShowAdd(false);
      await load();
      navigate(`/content-calendar/${created.id}`);
    } catch (e: any) {
      notify(e?.response?.data?.message || 'فشل إضافة الشهر', 'error');
    }
  };

  const toggleStatus = async (m: CalMonth) => {
    try {
      const updated = await calendarApi.updateMonth(m.id, { status: m.status === 'active' ? 'done' : 'active' });
      setMonths((prev) => prev.map((x) => (x.id === m.id ? { ...x, status: updated.status } : x)));
    } catch (e: any) {
      notify(e?.response?.data?.message || 'فشل التحديث', 'error');
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await calendarApi.deleteMonth(confirmDeleteId);
      setMonths((prev) => prev.filter((x) => x.id !== confirmDeleteId));
    } catch (e: any) {
      notify(e?.response?.data?.message || 'فشل الحذف', 'error');
    } finally {
      setConfirmDeleteId(null);
    }
  };

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500 dark:text-gray-400" dir="rtl">
        <Lock className="h-10 w-10 mb-3" />
        <p>ليس لديك صلاحية لعرض تقويم المحتوى</p>
      </div>
    );
  }

  const active = months.filter((m) => m.status === 'active');
  const done = months.filter((m) => m.status === 'done');

  const MonthCard: React.FC<{ m: CalMonth }> = ({ m }) => (
    <div className="group relative flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-brand-400 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-brand-500">
      <button onClick={() => navigate(`/content-calendar/${m.id}`)} className="flex flex-1 items-center gap-3 text-right">
        <span
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg text-lg font-bold text-white shadow"
          style={{ backgroundColor: m.iconColor }}
        >
          {m.month}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-gray-900 dark:text-white">{m.title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {personName(m.ownerId) || (user?.name ?? '')}
          </p>
        </div>
      </button>
      <div className="flex items-center gap-1">
        {canEdit && (
          <button
            onClick={() => toggleStatus(m)}
            title={m.status === 'active' ? 'وضع كمنتهي (DONE)' : 'إرجاع كنشط'}
            className="rounded-lg p-2 text-gray-400 opacity-0 transition-opacity hover:bg-gray-100 hover:text-emerald-500 group-hover:opacity-100 dark:hover:bg-white/5"
          >
            {m.status === 'active' ? <CheckCircle2 className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
          </button>
        )}
        {canRemove && (
          <button
            onClick={() => setConfirmDeleteId(m.id)}
            title="حذف"
            className="rounded-lg p-2 text-gray-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        <ChevronLeft className="h-5 w-5 text-gray-300 dark:text-gray-600" />
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl" dir="rtl">
      {/* Workspace / Owner header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar src={(user as any)?.avatar} alt={user?.name} initials={user?.name?.charAt(0)} size="large" />
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
              <CalendarDays className="h-6 w-6 text-brand-500" />
              تقويم المحتوى
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user?.name} — إدارة محتوى السوشيال ميديا شهريًا</p>
          </div>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 self-start rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600"
          >
            <Plus className="h-4 w-4" /> شهر جديد
          </button>
        )}
      </div>

      {loading ? (
        <p className="py-10 text-center text-gray-500 dark:text-gray-400">جارٍ التحميل…</p>
      ) : (
        <>
          {/* Active months */}
          <div className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">الشهور النشطة</h2>
            {active.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-300 py-10 text-center text-gray-400 dark:border-gray-700">
                لا توجد شهور نشطة{canEdit ? ' — ابدأ بإضافة شهر جديد' : ''}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {active.map((m) => <MonthCard key={m.id} m={m} />)}
              </div>
            )}
          </div>

          {/* DONE collapsible toggle */}
          {done.length > 0 && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-800">
              <button
                onClick={() => setDoneOpen((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-3 text-right"
              >
                <span className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-200">
                  <ChevronDown className={`h-4 w-4 transition-transform ${doneOpen ? '' : '-rotate-90'}`} />
                  DONE
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    {done.length}
                  </span>
                </span>
              </button>
              {doneOpen && (
                <div className="grid grid-cols-1 gap-3 border-t border-gray-100 p-4 sm:grid-cols-2 lg:grid-cols-3 dark:border-gray-800">
                  {done.map((m) => <MonthCard key={m.id} m={m} />)}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Add month modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="إضافة شهر جديد" size="sm">
        <div className="space-y-4" dir="rtl">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm text-gray-600 dark:text-gray-300">الشهر</label>
              <select
                value={form.month}
                onChange={(e) => setForm({ ...form, month: Number(e.target.value) })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((mo) => (
                  <option key={mo} value={mo}>{mo}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-gray-600 dark:text-gray-300">السنة</label>
              <input
                type="number"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-gray-600 dark:text-gray-300">لون أيقونة الشهر</label>
            <div className="flex flex-wrap gap-2">
              {MONTH_ICON_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setForm({ ...form, iconColor: c })}
                  className={`h-8 w-8 rounded-lg border-2 transition-transform ${form.iconColor === c ? 'scale-110 border-gray-900 dark:border-white' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg font-bold text-white" style={{ backgroundColor: form.iconColor }}>
              {form.month}
            </span>
            سيتم إنشاء «{form.month} - {form.year}» مع صفوف بعدد أيام الشهر (نمط راحه).
          </div>
          <div className="flex justify-start gap-2 pt-2">
            <button onClick={handleAdd} className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600">
              إنشاء
            </button>
            <button onClick={() => setShowAdd(false)} className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800">
              إلغاء
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={handleDelete}
        title="حذف الشهر"
        message="هيتم حذف الشهر وكل الصفوف اللي جواه. متأكد؟"
        confirmText="حذف"
        type="danger"
      />

      <Toast message={toast.message} type={toast.type} isOpen={toast.isOpen} onClose={() => setToast({ ...toast, isOpen: false })} />
    </div>
  );
};

export default ContentCalendar;
