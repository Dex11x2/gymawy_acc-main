import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { usePermissions } from '../hooks/usePermissions';
import { videoReviewApi, VideoReview, ReviewStep, personName, personId } from '../services/videoReview';
import { calendarApi, CalMonth, CalEntry, CalAccount } from '../services/contentCalendar';
import { PLATFORMS } from '../config/contentCalendar';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Toast from '../components/Toast';
import Avatar from '../components/ui/Avatar';
import { Plus, ExternalLink, Trash2, CheckCircle2, Clock, Eye, EyeOff, Film, MessageSquarePlus, Send, ClipboardCheck } from 'lucide-react';

interface UserOpt { id: string; name: string }

const pad = (n: number) => String(n).padStart(2, '0');
const fmt = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  const h24 = d.getHours();
  const ampm = h24 < 12 ? 'ص' : 'م';
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${h24 % 12 || 12}:${pad(d.getMinutes())} ${ampm}`;
};
const toLocalInput = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const STATUS: Record<string, { label: string; color: string }> = {
  in_review: { label: 'تحت المراجعة', color: '#F59E0B' },
  changes_requested: { label: 'مطلوب تعديل', color: '#EF4444' },
  approved: { label: 'معتمد', color: '#22C55E' },
};

const KIND: Record<string, { label: string; icon: any; color: string }> = {
  upload: { label: 'رفع الفيديو', icon: Film, color: '#3B82F6' },
  revision: { label: 'نسخة/تعديل', icon: Film, color: '#8B5CF6' },
  edit_request: { label: 'طلب تعديل', icon: MessageSquarePlus, color: '#EF4444' },
  approve: { label: 'اعتماد', icon: CheckCircle2, color: '#22C55E' },
};

const MANAGER_ROLES = ['dev', 'general_manager', 'administrative_manager'];

const VideoReviews: React.FC = () => {
  const { user } = useAuthStore();
  const { canRead, canWrite, canDelete } = usePermissions();
  const canView = canRead('video_reviews');
  const canEdit = canWrite('video_reviews');
  const canRemove = canDelete('video_reviews');
  const isManager = MANAGER_ROLES.includes(user?.role || '');

  const [reviews, setReviews] = useState<VideoReview[]>([]);
  const [users, setUsers] = useState<UserOpt[]>([]);
  const [accounts, setAccounts] = useState<CalAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [open, setOpen] = useState<VideoReview | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isOpen: boolean }>({ message: '', type: 'success', isOpen: false });
  const notify = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type, isOpen: true });

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', account: '', link: '', note: '', mentionIds: [] as string[] });

  // Drawer action forms
  const [stepForm, setStepForm] = useState<{ kind: 'revision' | 'edit_request'; link: string; note: string; mentionIds: string[] } | null>(null);

  // Approve modal
  const [showApprove, setShowApprove] = useState(false);
  const [months, setMonths] = useState<CalMonth[]>([]);
  const [approveForm, setApproveForm] = useState({ monthId: '', account: '', entryId: '', publishDate: '', platforms: [] as string[] });
  const [approveEntries, setApproveEntries] = useState<CalEntry[]>([]);

  const load = async () => {
    try {
      setLoading(true);
      const [rev, accs] = await Promise.all([videoReviewApi.getReviews(), calendarApi.getAccounts().catch(() => [])]);
      setReviews(rev);
      setAccounts(accs as CalAccount[]);
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
    } catch { /* optional */ }
  };

  useEffect(() => {
    if (canView) { load(); loadUsers(); } else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const replaceReview = (r: VideoReview) => setReviews((prev) => prev.map((x) => (x.id === r.id ? r : x)));

  const openReview = async (r: VideoReview) => {
    setOpen(r);
    setStepForm(null);
    // Mark steps addressed to me as seen.
    try {
      const updated = await videoReviewApi.markSeen(r.id);
      setOpen(updated);
      replaceReview(updated);
    } catch { /* ignore */ }
  };

  const handleCreate = async () => {
    if (!createForm.title.trim()) return;
    try {
      const created = await videoReviewApi.createReview({
        title: createForm.title.trim(),
        account: createForm.account || undefined,
        link: createForm.link.trim() || undefined,
        note: createForm.note.trim() || undefined,
        mentionIds: createForm.mentionIds,
        mentionNames: createForm.mentionIds.map((id) => users.find((u) => u.id === id)?.name || ''),
      });
      setReviews((prev) => [created, ...prev]);
      setShowCreate(false);
      setCreateForm({ title: '', account: '', link: '', note: '', mentionIds: [] });
      notify('تم إنشاء المراجعة');
    } catch (e: any) {
      notify(e?.response?.data?.message || 'فشل الإنشاء', 'error');
    }
  };

  const handleAddStep = async () => {
    if (!open || !stepForm) return;
    try {
      const updated = await videoReviewApi.addStep(open.id, {
        kind: stepForm.kind,
        link: stepForm.link.trim() || undefined,
        note: stepForm.note.trim() || undefined,
        mentionIds: stepForm.mentionIds,
        mentionNames: stepForm.mentionIds.map((id) => users.find((u) => u.id === id)?.name || ''),
      });
      setOpen(updated);
      replaceReview(updated);
      setStepForm(null);
      notify('تم');
    } catch (e: any) {
      notify(e?.response?.data?.message || 'فشل', 'error');
    }
  };

  const openApprove = async () => {
    setShowApprove(true);
    setApproveForm({ monthId: '', account: open?.account || '', entryId: '', publishDate: '', platforms: [] });
    setApproveEntries([]);
    if (!months.length) {
      try { setMonths(await calendarApi.getMonths()); } catch { /* ignore */ }
    }
  };

  const loadApproveEntries = async (monthId: string) => {
    try { setApproveEntries(await calendarApi.getEntries(monthId)); } catch { setApproveEntries([]); }
  };

  const handleApprove = async () => {
    if (!open || !approveForm.entryId) { notify('اختر صفًا في الجدول', 'error'); return; }
    try {
      const updated = await videoReviewApi.approve(open.id, {
        entryId: approveForm.entryId,
        publishDate: approveForm.publishDate ? new Date(approveForm.publishDate).toISOString() : undefined,
        platforms: approveForm.platforms,
      });
      setOpen(updated);
      replaceReview(updated);
      setShowApprove(false);
      notify('تم الاعتماد وربطه بالجدول');
    } catch (e: any) {
      notify(e?.response?.data?.message || 'فشل الاعتماد', 'error');
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await videoReviewApi.deleteReview(confirmDeleteId);
      setReviews((prev) => prev.filter((x) => x.id !== confirmDeleteId));
      if (open?.id === confirmDeleteId) setOpen(null);
    } catch (e: any) {
      notify(e?.response?.data?.message || 'فشل الحذف', 'error');
    } finally {
      setConfirmDeleteId(null);
    }
  };

  if (!canView) {
    return <p className="py-10 text-center text-gray-500 dark:text-gray-400">ليس لديك صلاحية</p>;
  }

  const shown = filter === 'all' ? reviews : reviews.filter((r) => r.status === filter);
  const canApprove = !!open && open.status !== 'approved' && (isManager || (open.currentMentionIds || []).some((m) => personId(m) === user?.id));
  const inputCls = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white';

  return (
    <div dir="rtl">
      <div className="mb-6 flex items-center gap-2">
        <ClipboardCheck className="h-6 w-6 text-brand-500" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">مراجعة الفيديوهات</h1>
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {['all', 'in_review', 'changes_requested', 'approved'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${filter === f ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'}`}
            >
              {f === 'all' ? 'الكل' : STATUS[f].label}
              <span className="mr-1 opacity-70">({f === 'all' ? reviews.length : reviews.filter((r) => r.status === f).length})</span>
            </button>
          ))}
        </div>
        {canEdit && (
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
            <Plus className="h-4 w-4" /> فيديو جديد للمراجعة
          </button>
        )}
      </div>

      {loading ? (
        <p className="py-10 text-center text-gray-500 dark:text-gray-400">جارٍ التحميل…</p>
      ) : shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 py-12 text-center text-gray-400 dark:border-gray-700">لا توجد مراجعات</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((r) => {
            const st = STATUS[r.status];
            const lastStep = r.steps[r.steps.length - 1];
            return (
              <button
                key={r.id}
                onClick={() => openReview(r)}
                className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 text-right transition-colors hover:border-brand-400 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-brand-500"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-gray-900 dark:text-white">{r.title}</p>
                  <span className="whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: st.color + '26', color: st.color }}>{st.label}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>{r.steps.length} خطوة</span>
                  {(r.currentMentionIds?.length ?? 0) > 0 && r.status !== 'approved' && (
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> مطلوب من: {r.currentMentionIds!.map(personName).filter(Boolean).join('، ')}</span>
                  )}
                </div>
                {lastStep && <p className="truncate text-xs text-gray-400">آخر خطوة: {KIND[lastStep.kind]?.label} — {personName(lastStep.byId) || lastStep.byName}</p>}
              </button>
            );
          })}
        </div>
      )}

      {/* Review drawer */}
      <Modal isOpen={!!open} onClose={() => setOpen(null)} title={open?.title || 'مراجعة'} size="xl">
        {open && (
          <div dir="rtl" className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: STATUS[open.status].color + '26', color: STATUS[open.status].color }}>{STATUS[open.status].label}</span>
              {(open.currentMentionIds?.length ?? 0) > 0 && open.status !== 'approved' && (
                <span className="text-sm text-gray-500 dark:text-gray-400">مطلوب من: <b>{open.currentMentionIds!.map(personName).filter(Boolean).join('، ')}</b></span>
              )}
              {canRemove && (
                <button onClick={() => setConfirmDeleteId(open.id)} className="mr-auto rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></button>
              )}
            </div>

            {/* Timeline */}
            <div className="space-y-3 border-r-2 border-gray-100 pr-4 dark:border-gray-800">
              {open.steps.map((s: ReviewStep) => {
                const k = KIND[s.kind] || KIND.revision;
                const Icon = k.icon;
                return (
                  <div key={s.id} className="relative">
                    <span className="absolute -right-[22px] flex h-5 w-5 items-center justify-center rounded-full text-white" style={{ backgroundColor: k.color }}>
                      <Icon className="h-3 w-3" />
                    </span>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/40">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Avatar alt={personName(s.byId) || s.byName} initials={(personName(s.byId) || s.byName || '?').charAt(0)} size="small" />
                          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{personName(s.byId) || s.byName || 'مستخدم'}</span>
                          <span className="rounded px-1.5 py-0.5 text-[11px] font-medium" style={{ backgroundColor: k.color + '22', color: k.color }}>{k.label}</span>
                        </div>
                        <span className="text-xs text-gray-400">{fmt(s.createdAt)}</span>
                      </div>
                      {s.note && <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{s.note}</p>}
                      {s.link && (
                        <a href={s.link} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm text-brand-500 hover:underline">
                          <ExternalLink className="h-3.5 w-3.5" /> فتح اللينك
                        </a>
                      )}
                      {(s.mentionIds?.length ?? 0) > 0 && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                          <span className="text-gray-500 dark:text-gray-400">منشن:</span>
                          {s.mentionIds!.map((m, i) => {
                            const mid = personId(m);
                            const name = personName(m) || s.mentionNames?.[i] || 'مستخدم';
                            const seen = (s.seenBy || []).some((sb) => personId(sb.userId) === mid);
                            return (
                              <span key={mid || i} className={`flex items-center gap-1 rounded px-1.5 py-0.5 ${seen ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-800'}`}>
                                {seen ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />} {name}{seen ? ' ✓' : ''}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            {open.status !== 'approved' && canEdit && (
              <div className="space-y-3 border-t border-gray-100 pt-3 dark:border-gray-800">
                {!stepForm ? (
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setStepForm({ kind: 'revision', link: '', note: '', mentionIds: [] })} className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800">
                      <Film className="h-4 w-4" /> رفع نسخة/تعديل
                    </button>
                    <button onClick={() => setStepForm({ kind: 'edit_request', link: '', note: '', mentionIds: [] })} className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800">
                      <MessageSquarePlus className="h-4 w-4" /> طلب تعديل
                    </button>
                    {canApprove && (
                      <button onClick={openApprove} className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600">
                        <CheckCircle2 className="h-4 w-4" /> اعتماد (Approve)
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{stepForm.kind === 'revision' ? 'رفع نسخة/تعديل جديد' : 'طلب تعديل'}</p>
                    {stepForm.kind === 'revision' && (
                      <input className={inputCls} placeholder="لينك النسخة الجديدة (درايف…)" value={stepForm.link} onChange={(e) => setStepForm({ ...stepForm, link: e.target.value })} />
                    )}
                    <textarea className={inputCls} rows={3} placeholder={stepForm.kind === 'revision' ? 'وصف اللي اتعمل (اختياري)' : 'اكتب التعديل المطلوب بالتفصيل'} value={stepForm.note} onChange={(e) => setStepForm({ ...stepForm, note: e.target.value })} />
                    <div>
                      <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">منشن (تقدر تختار أكتر من واحد)</label>
                      <UserMultiSelect users={users} selected={stepForm.mentionIds} onChange={(ids) => setStepForm({ ...stepForm, mentionIds: ids })} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleAddStep} className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"><Send className="h-4 w-4" /> إرسال</button>
                      <button onClick={() => setStepForm(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-600 dark:text-gray-200">إلغاء</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {open.status === 'approved' && (
              <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                ✅ تم الاعتماد بواسطة {personName(open.approvedById)} — واتربط بصف في الجدول.
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="فيديو جديد للمراجعة" size="md">
        <div className="space-y-3" dir="rtl">
          <input className={inputCls} placeholder="اسم الفيديو *" value={createForm.title} onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })} autoFocus />
          <select className={inputCls} value={createForm.account} onChange={(e) => setCreateForm({ ...createForm, account: e.target.value })}>
            <option value="">الحساب (اختياري)</option>
            {accounts.map((a) => <option key={a.key} value={a.key}>{a.name}</option>)}
          </select>
          <input className={inputCls} placeholder="لينك الفيديو (درايف)" value={createForm.link} onChange={(e) => setCreateForm({ ...createForm, link: e.target.value })} />
          <textarea className={inputCls} rows={2} placeholder="ملاحظة (اختياري)" value={createForm.note} onChange={(e) => setCreateForm({ ...createForm, note: e.target.value })} />
          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">منشن للمراجِعين (تقدر تختار أكتر من واحد)</label>
            <UserMultiSelect users={users} selected={createForm.mentionIds} onChange={(ids) => setCreateForm({ ...createForm, mentionIds: ids })} />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleCreate} className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600">إنشاء</button>
            <button onClick={() => setShowCreate(false)} className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm text-gray-700 dark:border-gray-600 dark:text-gray-200">إلغاء</button>
          </div>
        </div>
      </Modal>

      {/* Approve modal */}
      <Modal isOpen={showApprove} onClose={() => setShowApprove(false)} title="اعتماد وربط بالجدول" size="md">
        <div className="space-y-3" dir="rtl">
          <p className="text-sm text-gray-500 dark:text-gray-400">اختار الصف اللي الفيديو المعتمد هيتحط فيه:</p>
          <select className={inputCls} value={approveForm.monthId} onChange={(e) => { const m = e.target.value; setApproveForm({ ...approveForm, monthId: m, entryId: '' }); if (m) loadApproveEntries(m); }}>
            <option value="">اختر الشهر…</option>
            {months.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
          {approveForm.monthId && (
            <select className={inputCls} value={approveForm.account} onChange={(e) => setApproveForm({ ...approveForm, account: e.target.value, entryId: '' })}>
              <option value="">اختر الحساب…</option>
              {accounts.map((a) => <option key={a.key} value={a.key}>{a.name}</option>)}
            </select>
          )}
          {approveForm.monthId && approveForm.account && (
            <select className={inputCls} value={approveForm.entryId} onChange={(e) => setApproveForm({ ...approveForm, entryId: e.target.value })}>
              <option value="">اختر الصف…</option>
              {approveEntries.filter((en) => en.account === approveForm.account).map((en, i) => (
                <option key={en.id} value={en.id}>{i + 1}. {en.title || '(بدون اسم)'} {en.publishDate ? '— ' + fmt(en.publishDate) : ''}</option>
              ))}
            </select>
          )}
          <div>
            <label className="mb-1 block text-sm text-gray-600 dark:text-gray-300">تاريخ/ساعة الرفع</label>
            <input type="datetime-local" className={inputCls} value={approveForm.publishDate} onChange={(e) => setApproveForm({ ...approveForm, publishDate: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-600 dark:text-gray-300">المنصات</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((o) => {
                const active = approveForm.platforms.includes(o.key);
                return (
                  <button key={o.key} onClick={() => { const set = new Set(approveForm.platforms); if (active) set.delete(o.key); else set.add(o.key); setApproveForm({ ...approveForm, platforms: Array.from(set) }); }}
                    className="rounded-md border px-2 py-0.5 text-xs font-medium" style={active ? { backgroundColor: o.color + '26', color: o.color, borderColor: o.color + '55' } : { color: '#9ca3af', borderColor: '#9ca3af40' }}>
                    {o.labelAr}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleApprove} className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-600">اعتماد</button>
            <button onClick={() => setShowApprove(false)} className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm text-gray-700 dark:border-gray-600 dark:text-gray-200">إلغاء</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)} onConfirm={handleDelete} title="حذف المراجعة" message="متأكد من الحذف؟" confirmText="حذف" type="danger" />
      <Toast message={toast.message} type={toast.type} isOpen={toast.isOpen} onClose={() => setToast({ ...toast, isOpen: false })} />
    </div>
  );
};

const UserMultiSelect: React.FC<{ users: UserOpt[]; selected: string[]; onChange: (ids: string[]) => void }> = ({ users, selected, onChange }) => (
  <div className="max-h-36 overflow-y-auto rounded-lg border border-gray-300 p-1 dark:border-gray-600">
    {users.length === 0 && <p className="px-2 py-1 text-xs text-gray-400">لا يوجد مستخدمون</p>}
    {users.map((u) => {
      const on = selected.includes(u.id);
      return (
        <label key={u.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-gray-100 dark:hover:bg-white/5">
          <input
            type="checkbox"
            checked={on}
            onChange={(e) => onChange(e.target.checked ? [...selected, u.id] : selected.filter((x) => x !== u.id))}
            className="h-4 w-4 accent-brand-500"
          />
          <span className="text-gray-700 dark:text-gray-200">{u.name}</span>
        </label>
      );
    })}
  </div>
);

export default VideoReviews;
