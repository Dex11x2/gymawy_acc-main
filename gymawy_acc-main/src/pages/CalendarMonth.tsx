import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import { calendarApi, CalMonth, CalEntry, CalAccount, personId } from '../services/contentCalendar';
import { CONTENT_TYPES, PLATFORMS, CalSelectOption, findOption, MONTH_ICON_COLORS } from '../config/contentCalendar';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Toast from '../components/Toast';
import { ChevronRight, Plus, Trash2, MessageSquare, Table2, Send, Lock, FileText, Copy, Pencil } from 'lucide-react';

interface UserOpt { id: string; name: string }

const pad = (n: number) => String(n).padStart(2, '0');
const toLocalInput = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : undefined);
const formatDT = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  const h24 = d.getHours();
  const ampm = h24 < 12 ? 'ص' : 'م';
  const h = h24 % 12 || 12;
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${h}:${pad(d.getMinutes())} ${ampm}`;
};
const weekdayAr = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('ar-EG', { weekday: 'long' }) : '');
const shortDate = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
};

// True when the entry's publish date falls on `ref` (today). publishDate is
// stored at noon so timezone offsets never roll it to an adjacent day.
const isSameDay = (iso: string | undefined, ref: Date) => {
  if (!iso) return false;
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth() && d.getDate() === ref.getDate();
};

const Tag: React.FC<{ opt?: CalSelectOption }> = ({ opt }) =>
  opt ? (
    <span
      className="inline-block whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: opt.color + '26', color: opt.color, borderColor: opt.color + '55' }}
    >
      {opt.labelAr}
    </span>
  ) : (
    <span className="text-gray-300 dark:text-gray-600">—</span>
  );

const CalendarMonth: React.FC = () => {
  const { monthId } = useParams<{ monthId: string }>();
  const navigate = useNavigate();
  const { canRead, canWrite, canDelete } = usePermissions();
  const canView = canRead('content_calendar');
  const canEdit = canWrite('content_calendar');
  const canRemove = canDelete('content_calendar');

  const [month, setMonth] = useState<CalMonth | null>(null);
  const [entries, setEntries] = useState<CalEntry[]>([]);
  const [accounts, setAccounts] = useState<CalAccount[]>([]);
  const [users, setUsers] = useState<UserOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [accForm, setAccForm] = useState({ name: '', color: MONTH_ICON_COLORS[0] });
  const [editing, setEditing] = useState<CalEntry | null>(null);
  const [captionView, setCaptionView] = useState<CalEntry | null>(null);
  const [draft, setDraft] = useState<Partial<CalEntry>>({});
  const [commentText, setCommentText] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isOpen: boolean }>({ message: '', type: 'success', isOpen: false });

  const notify = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type, isOpen: true });

  const load = async () => {
    if (!monthId) return;
    try {
      setLoading(true);
      const [monthsData, entriesData, accountsData] = await Promise.all([
        calendarApi.getMonths(),
        calendarApi.getEntries(monthId),
        calendarApi.getAccounts(),
      ]);
      setMonth(monthsData.find((m) => m.id === monthId) || null);
      setEntries(entriesData);
      setAccounts(accountsData);
      setSelectedAccount((prev) => (prev && accountsData.some((a) => a.key === prev) ? prev : accountsData[0]?.key || ''));
    } catch (e: any) {
      notify(e?.response?.data?.message || 'فشل التحميل', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await api.get('/users');
      const list = Array.isArray(res.data) ? res.data : res.data?.users || [];
      setUsers(list.map((u: any) => ({ id: u.id || u._id, name: u.name })).filter((u: UserOpt) => u.id && u.name));
    } catch {
      /* users are optional for the Person fields */
    }
  };

  useEffect(() => {
    if (canView) { load(); loadUsers(); }
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthId]);

  // Rows shown for the currently selected account tab.
  const visibleEntries = entries.filter((e) => e.account === selectedAccount);
  const today = new Date();

  const patchEntry = async (id: string, data: Partial<CalEntry>) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...data } : e)));
    try {
      const updated = await calendarApi.updateEntry(id, data);
      setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
    } catch (e: any) {
      notify(e?.response?.data?.message || 'فشل الحفظ', 'error');
      load();
    }
  };

  const openEditor = (e: CalEntry) => {
    setEditing(e);
    setDraft({ ...e });
    setCommentText('');
  };

  const copyCaption = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notify('تم نسخ الكابشن');
    } catch {
      notify('تعذّر النسخ — انسخه يدويًا', 'error');
    }
  };

  const editFromCaption = () => {
    const e = captionView;
    setCaptionView(null);
    if (e) openEditor(e);
  };

  const saveEditor = async () => {
    if (!editing) return;
    try {
      const payload: Record<string, any> = {
        title: draft.title,
        contentType: draft.contentType,
        publishDate: draft.publishDate,
        videoLink: draft.videoLink,
        platforms: draft.platforms,
        assigneeId: personId(draft.assigneeId) || null,
        collaboration: draft.collaboration,
        filmed: draft.filmed,
        done: draft.done,
        script: draft.script,
        isRest: draft.contentType === 'rest',
      };
      const updated = await calendarApi.updateEntry(editing.id, payload);
      setEntries((prev) => prev.map((e) => (e.id === editing.id ? updated : e)));
      setEditing(null);
      notify('تم الحفظ');
    } catch (e: any) {
      notify(e?.response?.data?.message || 'فشل الحفظ', 'error');
    }
  };

  const addRow = async () => {
    if (!monthId) return;
    try {
      const maxOrder = visibleEntries.reduce((m, e) => Math.max(m, e.rowOrder || 0), 0);
      const created = await calendarApi.createEntry(monthId, {
        account: selectedAccount,
        rowOrder: maxOrder + 1,
        platforms: [],
      });
      setEntries((prev) => [...prev, created]);
    } catch (e: any) {
      notify(e?.response?.data?.message || 'فشل إضافة الصف', 'error');
    }
  };

  const accColor = (key: string) => accounts.find((a) => a.key === key)?.color || '#3B82F6';

  const handleGenerateDays = async () => {
    if (!monthId || !selectedAccount) return;
    try {
      await calendarApi.generateDays(monthId, selectedAccount);
      await load();
      notify('تم توليد أيام الشهر');
    } catch (e: any) {
      notify(e?.response?.data?.message || 'فشل توليد الأيام', 'error');
    }
  };

  const handleAddAccount = async () => {
    const name = accForm.name.trim();
    if (!name) return;
    try {
      const acc = await calendarApi.createAccount({ name, color: accForm.color });
      setAccounts((prev) => [...prev, acc]);
      setSelectedAccount(acc.key);
      setShowAddAccount(false);
      setAccForm({ name: '', color: MONTH_ICON_COLORS[0] });
      notify('تم إضافة الحساب');
    } catch (e: any) {
      notify(e?.response?.data?.message || 'فشل إضافة الحساب', 'error');
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await calendarApi.deleteEntry(confirmDeleteId);
      setEntries((prev) => prev.filter((e) => e.id !== confirmDeleteId));
    } catch (e: any) {
      notify(e?.response?.data?.message || 'فشل الحذف', 'error');
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const addComment = async () => {
    if (!editing || !commentText.trim()) return;
    try {
      const updated = await calendarApi.addComment(editing.id, commentText.trim());
      setEntries((prev) => prev.map((e) => (e.id === editing.id ? updated : e)));
      setDraft((d) => ({ ...d, comments: updated.comments }));
      setCommentText('');
    } catch (e: any) {
      notify(e?.response?.data?.message || 'فشل إضافة التعليق', 'error');
    }
  };

  const inputCls = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white';
  const thCls = 'whitespace-nowrap px-3 py-2.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400';
  const tdCls = 'whitespace-nowrap px-3 py-2 text-sm text-gray-800 dark:text-gray-200 align-middle';

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500 dark:text-gray-400" dir="rtl">
        <Lock className="h-10 w-10 mb-3" />
        <p>ليس لديك صلاحية لعرض تقويم المحتوى</p>
      </div>
    );
  }

  return (
    <div dir="rtl">
      {/* Breadcrumb / header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/content-calendar')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-brand-500 dark:text-gray-400">
            تقويم المحتوى
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg text-base font-bold text-white shadow" style={{ backgroundColor: month?.iconColor || '#3B82F6' }}>
              {month?.month ?? ''}
            </span>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{month?.title || 'الشهر'}</h1>
          </div>
        </div>
        {canEdit && (
          <button onClick={addRow} className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
            <Plus className="h-4 w-4" /> صف جديد
          </button>
        )}
      </div>

      {/* Account selector (dropdown) */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-sm text-gray-500 dark:text-gray-400">الحساب:</span>
        <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 dark:border-gray-600 dark:bg-gray-800">
          <span className="h-3 w-3 flex-shrink-0 rounded-full" style={{ backgroundColor: accColor(selectedAccount) }} />
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="bg-transparent text-sm font-medium text-gray-800 outline-none dark:text-white"
          >
            {accounts.length === 0 && <option value="">—</option>}
            {accounts.map((a) => {
              const count = entries.filter((e) => e.account === a.key).length;
              return <option key={a.key} value={a.key}>{a.name}{count > 0 ? ` (${count})` : ''}</option>;
            })}
          </select>
        </div>
        {canEdit && (
          <button onClick={() => setShowAddAccount(true)} className="flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:border-brand-400 hover:text-brand-500 dark:border-gray-600 dark:text-gray-300 dark:hover:border-brand-500">
            <Plus className="h-4 w-4" /> حساب جديد
          </button>
        )}
      </div>

      {/* Database / view label (mirrors Notion) */}
      <div className="mb-2 flex items-center gap-2 text-sm text-gray-400">
        <Table2 className="h-4 w-4" />
        <span className="font-medium text-gray-500 dark:text-gray-300">Calendar view</span>
        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800">Table</span>
      </div>

      {loading ? (
        <p className="py-10 text-center text-gray-500 dark:text-gray-400">جارٍ التحميل…</p>
      ) : (
        <>
        {/* Mobile card view — the 12-column table is unusable on touch screens.
            Tapping anywhere on a card opens the full editor; inner controls stop propagation. */}
        <div className="space-y-3 pb-32 lg:hidden">
          {visibleEntries.map((e, idx) => (
            <div
              key={e.id}
              onClick={() => openEditor(e)}
              className={`cursor-pointer rounded-xl border p-3 active:scale-[0.99] ${isSameDay(e.publishDate, today)
                ? 'border-brand-400/60 bg-brand-50 dark:bg-brand-500/10'
                : `border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] ${e.contentType === 'rest' ? 'opacity-60' : ''}`}`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {e.publishDate ? (
                    <span className="text-base font-bold text-gray-900 dark:text-white">{weekdayAr(e.publishDate)} {shortDate(e.publishDate)}</span>
                  ) : (
                    <span className="text-sm font-bold text-gray-400">#{idx + 1}</span>
                  )}
                  {isSameDay(e.publishDate, today) && (
                    <span className="rounded bg-brand-500 px-1.5 py-0.5 text-[10px] font-bold text-white">اليوم</span>
                  )}
                  <Tag opt={findOption(CONTENT_TYPES, e.contentType)} />
                  {e.done && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">✓ Done</span>}
                </div>
                <div className="flex flex-shrink-0 items-center gap-1">
                  <button onClick={(ev) => { ev.stopPropagation(); openEditor(e); }} title="فتح / تعديل" className="relative rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-brand-500 dark:hover:bg-white/5">
                    <MessageSquare className="h-5 w-5" />
                    {e.comments?.length > 0 && (
                      <span className="absolute -top-1 -left-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] text-white">{e.comments.length}</span>
                    )}
                  </button>
                  {canRemove && (
                    <button onClick={(ev) => { ev.stopPropagation(); setConfirmDeleteId(e.id); }} title="حذف" className="rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>

              {canEdit ? (
                <input
                  defaultValue={e.title}
                  key={e.id + e.title}
                  onClick={(ev) => ev.stopPropagation()}
                  onBlur={(ev) => { if (ev.target.value !== (e.title || '')) patchEntry(e.id, { title: ev.target.value }); }}
                  placeholder="اكتب اسم الفيديو…"
                  className="mb-2 w-full rounded-md bg-transparent px-1 py-1 text-base font-semibold text-gray-900 outline-none focus:bg-white focus:ring-1 focus:ring-brand-400 dark:text-white dark:focus:bg-gray-800"
                />
              ) : (
                <p className="mb-2 text-base font-semibold text-gray-900 dark:text-white">{e.title || '—'}</p>
              )}

              <div className="mb-2 space-y-1 text-sm text-gray-600 dark:text-gray-300">
                {e.publishDate && <p className="text-xs text-gray-400">{formatDT(e.publishDate)}</p>}
                {(e.assigneeId as any)?.name && <p>المسؤول: {(e.assigneeId as any).name}</p>}
                {e.collaboration && <p>تعاون: {e.collaboration}</p>}
                {e.platforms?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {e.platforms.map((p) => <Tag key={p} opt={findOption(PLATFORMS, p)} />)}
                  </div>
                )}
                {e.videoLink && (
                  <a href={e.videoLink} target="_blank" rel="noreferrer" onClick={(ev) => ev.stopPropagation()} className="inline-block text-brand-500 hover:underline">لينك الفيديو</a>
                )}
              </div>

              {(e.script || canEdit) && (
                <button
                  onClick={(ev) => { ev.stopPropagation(); setCaptionView(e); }}
                  className="mb-2 flex w-full items-center gap-1.5 rounded-md bg-gray-50 px-2 py-2 text-right text-sm text-gray-600 dark:bg-white/5 dark:text-gray-300"
                >
                  <FileText className={`h-4 w-4 flex-shrink-0 ${e.script ? 'text-brand-500' : 'text-gray-400'}`} />
                  {e.script ? <span className="truncate">{e.script}</span> : <span className="text-gray-400">إضافة كابشن</span>}
                </button>
              )}

              <div className="flex flex-wrap gap-5 border-t border-gray-100 pt-2 dark:border-gray-800" onClick={(ev) => ev.stopPropagation()}>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <input type="checkbox" checked={!!e.filmed} disabled={!canEdit} onChange={(ev) => patchEntry(e.id, { filmed: ev.target.checked })} className="h-5 w-5 accent-brand-500" /> اتصور؟
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <input type="checkbox" checked={!!e.done} disabled={!canEdit} onChange={(ev) => patchEntry(e.id, { done: ev.target.checked })} className="h-5 w-5 accent-emerald-500" /> Done
                </label>
              </div>
            </div>
          ))}
          {visibleEntries.length === 0 && (
            <div className="rounded-xl border border-gray-200 py-10 text-center dark:border-gray-800">
              <p className="mb-3 text-gray-400">لا توجد صفوف لهذا الحساب</p>
              {canEdit && (
                <div className="flex flex-wrap justify-center gap-2">
                  <button onClick={handleGenerateDays} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">توليد أيام الشهر</button>
                  <button onClick={addRow} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800">صف واحد</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Desktop table view */}
        <div className="hidden overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 lg:block">
          <table className="min-w-[1050px] w-full border-collapse">
            <thead className="bg-gray-50 dark:bg-gray-900/60">
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className={thCls}>#</th>
                <th className={thCls}>اسم الفيديو</th>
                <th className={thCls}>نوع المحتوى</th>
                <th className={thCls}>Publish Date</th>
                <th className={thCls}>Video link</th>
                <th className={thCls}>المنصات</th>
                <th className={thCls}>Assignee</th>
                <th className={thCls}>Collaboration</th>
                <th className={thCls}>الكابشن</th>
                <th className={thCls}>اتصور؟</th>
                <th className={thCls}>Done</th>
                <th className={thCls}></th>
              </tr>
            </thead>
            <tbody>
              {visibleEntries.map((e, idx) => (
                <tr
                  key={e.id}
                  className={`border-b border-gray-100 last:border-0 dark:border-gray-800/60 ${isSameDay(e.publishDate, today)
                    ? 'bg-brand-50 ring-1 ring-inset ring-brand-400/50 dark:bg-brand-500/10'
                    : `hover:bg-gray-50 dark:hover:bg-white/[0.03] ${e.contentType === 'rest' ? 'opacity-60' : ''}`}`}
                >
                  <td className={`${tdCls} text-gray-400`}>
                    <div className="flex items-center gap-1.5">
                      <span>{idx + 1}</span>
                      {isSameDay(e.publishDate, today) && (
                        <span className="rounded bg-brand-500 px-1.5 py-0.5 text-[10px] font-bold text-white">اليوم</span>
                      )}
                    </div>
                  </td>
                  <td className={tdCls}>
                    {canEdit ? (
                      <input
                        defaultValue={e.title}
                        key={e.id + e.title}
                        onBlur={(ev) => { if (ev.target.value !== (e.title || '')) patchEntry(e.id, { title: ev.target.value }); }}
                        placeholder="اسم الفيديو…"
                        className="w-44 rounded-md bg-transparent px-1 py-0.5 font-medium text-gray-900 outline-none focus:bg-white focus:ring-1 focus:ring-brand-400 dark:text-white dark:focus:bg-gray-800"
                      />
                    ) : (
                      <span className="font-medium">{e.title || '—'}</span>
                    )}
                  </td>
                  <td className={tdCls}><Tag opt={findOption(CONTENT_TYPES, e.contentType)} /></td>
                  <td className={`${tdCls} text-gray-500 dark:text-gray-400`}>{formatDT(e.publishDate) || '—'}</td>
                  <td className={tdCls}>
                    {e.videoLink ? (
                      <a href={e.videoLink} target="_blank" rel="noreferrer" className="text-brand-500 hover:underline">لينك</a>
                    ) : '—'}
                  </td>
                  <td className={tdCls}>
                    <div className="flex flex-wrap gap-1">
                      {e.platforms?.length ? e.platforms.map((p) => <Tag key={p} opt={findOption(PLATFORMS, p)} />) : '—'}
                    </div>
                  </td>
                  <td className={`${tdCls} text-gray-600 dark:text-gray-300`}>{(e.assigneeId as any)?.name || '—'}</td>
                  <td className={`${tdCls} text-gray-600 dark:text-gray-300`}>{e.collaboration || '—'}</td>
                  <td className={tdCls}>
                    <button
                      onClick={() => setCaptionView(e)}
                      className="flex max-w-[220px] items-center gap-1.5 rounded-md px-2 py-1 text-right text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
                      title={e.script || 'إضافة كابشن'}
                    >
                      <FileText className={`h-4 w-4 flex-shrink-0 ${e.script ? 'text-brand-500' : 'text-gray-400'}`} />
                      {e.script ? (
                        <span className="truncate">{e.script}</span>
                      ) : (
                        <span className="text-gray-400">إضافة كابشن</span>
                      )}
                    </button>
                  </td>
                  <td className={`${tdCls} text-center`}>
                    <input type="checkbox" checked={!!e.filmed} disabled={!canEdit} onChange={(ev) => patchEntry(e.id, { filmed: ev.target.checked })} className="h-4 w-4 accent-brand-500" />
                  </td>
                  <td className={`${tdCls} text-center`}>
                    <input type="checkbox" checked={!!e.done} disabled={!canEdit} onChange={(ev) => patchEntry(e.id, { done: ev.target.checked })} className="h-4 w-4 accent-emerald-500" />
                  </td>
                  <td className={tdCls}>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEditor(e)} title="فتح / تعديل" className="relative rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-brand-500 dark:hover:bg-white/5">
                        <MessageSquare className="h-4 w-4" />
                        {e.comments?.length > 0 && (
                          <span className="absolute -top-1 -left-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] text-white">{e.comments.length}</span>
                        )}
                      </button>
                      {canRemove && (
                        <button onClick={() => setConfirmDeleteId(e.id)} title="حذف" className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {visibleEntries.length === 0 && (
                <tr><td colSpan={12} className="py-10 text-center">
                  <p className="mb-3 text-gray-400">لا توجد صفوف لهذا الحساب</p>
                  {canEdit && (
                    <div className="flex justify-center gap-2">
                      <button onClick={handleGenerateDays} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">توليد أيام الشهر</button>
                      <button onClick={addRow} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800">صف واحد</button>
                    </div>
                  )}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        </>
      )}

      {/* Row details modal — read-only for view-only users, full editor otherwise */}
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title={draft.title || (canEdit ? 'تعديل الصف' : 'تفاصيل اليوم')} size="xl">
        {editing && !canEdit && (
          <div className="space-y-4" dir="rtl">
            <div className="space-y-2 rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-800">
              <DetailRow label="اليوم">{draft.publishDate ? `${weekdayAr(draft.publishDate)} — ${formatDT(draft.publishDate)}` : '—'}</DetailRow>
              <DetailRow label="نوع المحتوى"><Tag opt={findOption(CONTENT_TYPES, draft.contentType)} /></DetailRow>
              <DetailRow label="المنصات">
                {draft.platforms?.length ? (
                  <span className="flex flex-wrap gap-1">{draft.platforms.map((p) => <Tag key={p} opt={findOption(PLATFORMS, p)} />)}</span>
                ) : '—'}
              </DetailRow>
              <DetailRow label="المسؤول">{(draft.assigneeId as any)?.name || '—'}</DetailRow>
              <DetailRow label="تعاون">{draft.collaboration || '—'}</DetailRow>
              <DetailRow label="لينك الفيديو">
                {draft.videoLink ? <a href={draft.videoLink} target="_blank" rel="noreferrer" className="text-brand-500 hover:underline break-all">{draft.videoLink}</a> : '—'}
              </DetailRow>
              <DetailRow label="الحالة">
                <span className="flex flex-wrap gap-2">
                  <span className={`rounded px-2 py-0.5 text-xs font-bold ${draft.filmed ? 'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>{draft.filmed ? '✓ اتصور' : 'لم يتصور'}</span>
                  <span className={`rounded px-2 py-0.5 text-xs font-bold ${draft.done ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>{draft.done ? '✓ Done' : 'لم يكتمل'}</span>
                </span>
              </DetailRow>
            </div>

            <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                <FileText className="h-4 w-4 text-brand-500" /> الكابشن / السكريبت
              </p>
              {draft.script ? (
                <>
                  <div className="max-h-[45dvh] select-text overflow-y-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm leading-relaxed text-gray-800 dark:bg-gray-800/50 dark:text-gray-100">{draft.script}</div>
                  <button onClick={() => copyCaption(draft.script || '')} className="mt-3 flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600">
                    <Copy className="h-4 w-4" /> نسخ الكابشن
                  </button>
                </>
              ) : (
                <p className="text-sm text-gray-400">لا يوجد كابشن بعد</p>
              )}
            </div>

            <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
              <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">التعليقات ({draft.comments?.length || 0})</p>
              <div className="mb-3 max-h-40 space-y-2 overflow-y-auto">
                {(draft.comments || []).map((c) => (
                  <div key={c.id} className="rounded-lg bg-gray-50 p-2 text-sm dark:bg-gray-800/60">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700 dark:text-gray-200">{(c.authorId as any)?.name || c.authorName || 'مستخدم'}</span>
                      <span className="text-xs text-gray-400">{formatDT(c.createdAt)}</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300">{c.content}</p>
                  </div>
                ))}
                {(!draft.comments || draft.comments.length === 0) && <p className="text-sm text-gray-400">لا توجد تعليقات</p>}
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addComment()}
                  placeholder="أضف تعليق…"
                  className={inputCls}
                />
                <button onClick={addComment} className="flex-shrink-0 rounded-lg bg-brand-500 p-2.5 text-white hover:bg-brand-600">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex justify-start border-t border-gray-100 pt-3 dark:border-gray-800">
              <button onClick={() => setEditing(null)} className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800">إغلاق</button>
            </div>
          </div>
        )}
        {editing && canEdit && (
          <div className="space-y-4" dir="rtl">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="اسم الفيديو">
                <input className={inputCls} value={draft.title || ''} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              </Field>
              <Field label="نوع المحتوى">
                <select className={inputCls} value={draft.contentType || ''} onChange={(e) => setDraft({ ...draft, contentType: e.target.value })}>
                  <option value="">—</option>
                  {CONTENT_TYPES.map((o) => <option key={o.key} value={o.key}>{o.labelAr}</option>)}
                </select>
              </Field>
              <Field label="Publish Date">
                <input type="datetime-local" className={inputCls} value={toLocalInput(draft.publishDate)} onChange={(e) => setDraft({ ...draft, publishDate: fromLocalInput(e.target.value) })} />
              </Field>
              <Field label="Video link">
                <input className={inputCls} value={draft.videoLink || ''} onChange={(e) => setDraft({ ...draft, videoLink: e.target.value })} placeholder="https://drive.google.com/…" />
              </Field>
              <Field label="Assignee">
                <select className={inputCls} value={personId(draft.assigneeId)} onChange={(e) => setDraft({ ...draft, assigneeId: e.target.value || undefined })}>
                  <option value="">—</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </Field>
              <Field label="Collaboration">
                <input className={inputCls} value={draft.collaboration || ''} onChange={(e) => setDraft({ ...draft, collaboration: e.target.value })} />
              </Field>
              <Field label="المنصات">
                <div className="flex flex-wrap gap-3 pt-1">
                  {PLATFORMS.map((o) => {
                    const active = (draft.platforms || []).includes(o.key);
                    return (
                      <label key={o.key} className="flex cursor-pointer items-center gap-1.5 text-sm">
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={(e) => {
                            const set = new Set(draft.platforms || []);
                            if (e.target.checked) set.add(o.key); else set.delete(o.key);
                            setDraft({ ...draft, platforms: Array.from(set) });
                          }}
                          className="h-4 w-4 accent-brand-500"
                        />
                        <Tag opt={o} />
                      </label>
                    );
                  })}
                </div>
              </Field>
            </div>

            <div className="flex flex-wrap gap-6 border-t border-gray-100 pt-3 dark:border-gray-800">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                <input type="checkbox" checked={!!draft.filmed} onChange={(e) => setDraft({ ...draft, filmed: e.target.checked })} className="h-4 w-4 accent-brand-500" /> اتصور؟
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                <input type="checkbox" checked={!!draft.done} onChange={(e) => setDraft({ ...draft, done: e.target.checked })} className="h-4 w-4 accent-emerald-500" /> Done
              </label>
            </div>

            {/* Caption / script — prominent and large so the full text is visible */}
            <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                <FileText className="h-4 w-4 text-brand-500" /> الكابشن / السكريبت
              </label>
              <textarea
                rows={8}
                className={`${inputCls} min-h-[160px] resize-y leading-relaxed`}
                value={draft.script || ''}
                onChange={(e) => setDraft({ ...draft, script: e.target.value })}
                placeholder="اكتب الكابشن أو السكريبت هنا… (يظهر كامل ويتوسّع)"
              />
            </div>

            {/* Comments */}
            <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
              <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">التعليقات ({draft.comments?.length || 0})</p>
              <div className="mb-3 max-h-40 space-y-2 overflow-y-auto">
                {(draft.comments || []).map((c) => (
                  <div key={c.id} className="rounded-lg bg-gray-50 p-2 text-sm dark:bg-gray-800/60">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700 dark:text-gray-200">{(c.authorId as any)?.name || c.authorName || 'مستخدم'}</span>
                      <span className="text-xs text-gray-400">{formatDT(c.createdAt)}</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300">{c.content}</p>
                  </div>
                ))}
                {(!draft.comments || draft.comments.length === 0) && <p className="text-sm text-gray-400">لا توجد تعليقات</p>}
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addComment()}
                  placeholder="أضف تعليق…"
                  className={inputCls}
                />
                <button onClick={addComment} className="flex-shrink-0 rounded-lg bg-brand-500 p-2.5 text-white hover:bg-brand-600">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex justify-start gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
              <button onClick={saveEditor} disabled={!canEdit} className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">حفظ</button>
              <button onClick={() => setEditing(null)} className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800">إغلاق</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Caption viewer (read + copy) */}
      <Modal isOpen={!!captionView} onClose={() => setCaptionView(null)} title="الكابشن" size="lg">
        {captionView && (
          <div dir="rtl" className="space-y-4">
            {captionView.script ? (
              <>
                <div className="max-h-[60vh] select-text overflow-y-auto whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm leading-relaxed text-gray-800 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-100">
                  {captionView.script}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => copyCaption(captionView.script)} className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600">
                    <Copy className="h-4 w-4" /> نسخ الكابشن
                  </button>
                  {canEdit && (
                    <button onClick={editFromCaption} className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800">
                      <Pencil className="h-4 w-4" /> تعديل
                    </button>
                  )}
                  <button onClick={() => setCaptionView(null)} className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800">إغلاق</button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-4 py-6 text-center">
                <FileText className="h-10 w-10 text-gray-300 dark:text-gray-600" />
                <p className="text-gray-500 dark:text-gray-400">لا يوجد كابشن بعد</p>
                {canEdit && (
                  <button onClick={editFromCaption} className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600">
                    <Plus className="h-4 w-4" /> إضافة كابشن
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Add account modal */}
      <Modal isOpen={showAddAccount} onClose={() => setShowAddAccount(false)} title="حساب جديد" size="sm">
        <div className="space-y-4" dir="rtl">
          <Field label="اسم الحساب">
            <input
              className={inputCls}
              value={accForm.name}
              onChange={(e) => setAccForm({ ...accForm, name: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleAddAccount()}
              placeholder="مثلاً: صفحة جديدة"
              autoFocus
            />
          </Field>
          <div>
            <label className="mb-1.5 block text-sm text-gray-600 dark:text-gray-300">اللون</label>
            <div className="flex flex-wrap gap-2">
              {MONTH_ICON_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setAccForm({ ...accForm, color: c })}
                  className={`h-8 w-8 rounded-lg border-2 ${accForm.color === c ? 'scale-110 border-gray-900 dark:border-white' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-start gap-2 pt-1">
            <button onClick={handleAddAccount} className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600">إضافة</button>
            <button onClick={() => setShowAddAccount(false)} className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800">إلغاء</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={handleDelete}
        title="حذف الصف"
        message="متأكد من حذف الصف ده؟"
        confirmText="حذف"
        type="danger"
      />

      <Toast message={toast.message} type={toast.type} isOpen={toast.isOpen} onClose={() => setToast({ ...toast, isOpen: false })} />
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="mb-1.5 block text-sm text-gray-600 dark:text-gray-300">{label}</label>
    {children}
  </div>
);

const DetailRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
    <span className="w-24 flex-shrink-0 text-gray-400">{label}:</span>
    <span className="min-w-0 flex-1 text-gray-800 dark:text-gray-200">{children}</span>
  </div>
);

export default CalendarMonth;
