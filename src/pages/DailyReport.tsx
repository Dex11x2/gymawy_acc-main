import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';
import {
  dailyReportApi, DailyReport as DailyReportT, REPORT_SECTIONS,
  SectionStatus, statusMeta,
} from '../services/dailyReport';
import { toast } from '../store/toastStore';
import { Card, Button, Textarea } from '../components/ui';
import { LoadingState, ErrorState, EmptyState } from '../components/DataStates';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  Send, Trash2, ChevronDown, ClipboardList, Eye, PenLine, Activity, CheckCircle2,
} from 'lucide-react';

const STATUS_ORDER: SectionStatus[] = ['green', 'yellow', 'red'];
const RANK: Record<SectionStatus, number> = { green: 0, yellow: 1, red: 2 };
const worst = (arr: SectionStatus[]): SectionStatus => arr.reduce<SectionStatus>((w, s) => (RANK[s] > RANK[w] ? s : w), 'green');

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—';
const fmtTime = (d?: string) => d ? new Date(d).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '';

const DRAFT_KEY = 'daily-report-draft-v1';

type DraftSections = Record<string, { status: SectionStatus; text: string }>;

const emptySections = (): DraftSections =>
  REPORT_SECTIONS.reduce((acc, s) => { acc[s.key] = { status: 'green', text: '' }; return acc; }, {} as DraftSections);

const DailyReport: React.FC = () => {
  const { canWrite, canRead, canDelete } = usePermissions();
  const canFill = canWrite('daily_report');
  const canReview = canRead('daily_report');
  const canRemove = canDelete('daily_report');

  const [params, setParams] = useSearchParams();
  const initialTab = params.get('tab') === 'review' && canReview ? 'review' : (canFill ? 'fill' : 'review');
  const [tab, setTab] = useState<'fill' | 'review'>(initialTab);

  // ===== fill state (with local autosave) =====
  const [date, setDate] = useState<string>(todayStr());
  const [sections, setSections] = useState<DraftSections>(emptySections());
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // استرجاع المسودة المحفوظة تلقائياً
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.date) setDate(d.date);
        if (d.sections) setSections({ ...emptySections(), ...d.sections });
        if (typeof d.note === 'string') setNote(d.note);
      }
    } catch { /* ignore */ }
  }, []);

  // حفظ تلقائي للمسودة عند أي تغيير
  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ date, sections, note })); } catch { /* ignore */ }
  }, [date, sections, note]);

  const setSectionStatus = (key: string, status: SectionStatus) =>
    setSections((prev) => ({ ...prev, [key]: { ...prev[key], status } }));
  const setSectionText = (key: string, text: string) =>
    setSections((prev) => ({ ...prev, [key]: { ...prev[key], text } }));

  const submit = async () => {
    if (!canFill) return;
    setSubmitting(true);
    try {
      await dailyReportApi.create({
        date,
        sections: REPORT_SECTIONS.map((s) => ({ key: s.key, status: sections[s.key].status, text: sections[s.key].text })),
        note,
      });
      toast('تم إرسال التقرير للمدير العام ✅', 'success');
      // تفريغ المسودة بعد الإرسال
      setSections(emptySections());
      setNote('');
      setDate(todayStr());
      localStorage.removeItem(DRAFT_KEY);
      if (canReview) { loadReports(); }
    } catch (e: any) {
      toast(e?.response?.data?.message || 'تعذّر إرسال التقرير', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ===== review state =====
  const [reports, setReports] = useState<DailyReportT[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<DailyReportT | null>(null);

  const loadReports = useCallback(async () => {
    if (!canReview) { setLoading(false); return; }
    setLoading(true); setError(false);
    try {
      setReports(await dailyReportApi.getAll());
    } catch { setError(true); }
    finally { setLoading(false); }
  }, [canReview]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await dailyReportApi.remove(toDelete.id);
      setReports((prev) => prev.filter((r) => r.id !== toDelete.id));
      toast('تم حذف التقرير', 'success');
    } catch { toast('تعذّر حذف التقرير', 'error'); }
    finally { setToDelete(null); }
  };

  const switchTab = (t: 'fill' | 'review') => {
    setTab(t);
    const next = new URLSearchParams(params);
    if (t === 'review') next.set('tab', 'review'); else next.delete('tab');
    setParams(next, { replace: true });
  };

  // ===== Pulse Bar =====
  const PulseBar: React.FC<{ statuses: SectionStatus[] }> = ({ statuses }) => {
    const ov = worst(statuses);
    return (
      <div className={`rounded-2xl p-4 mb-6 border transition-colors ${
        ov === 'red' ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900'
          : ov === 'yellow' ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900'
            : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className={statusMeta[ov].text} size={20} />
            <span className="font-bold text-gray-800 dark:text-gray-100">شريط النبض</span>
          </div>
          <span className={`text-sm font-bold ${statusMeta[ov].text}`}>
            {statusMeta[ov].emoji} {ov === 'green' ? 'الدنيا ماشية عسل' : ov === 'yellow' ? 'فيه حاجات محتاجة انتباه' : 'فيه مشكلة محتاجة تدخّل'}
          </span>
        </div>
        <div className="flex gap-1.5">
          {REPORT_SECTIONS.map((s, i) => (
            <div key={s.key} className="flex-1 group relative">
              <div className={`h-2.5 rounded-full transition-colors ${statusMeta[statuses[i]].bar}`} />
              <div className="mt-1 text-[10px] text-center text-gray-500 dark:text-gray-400 truncate">{s.icon}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const StatusDot: React.FC<{ status: SectionStatus; size?: number }> = ({ status, size = 10 }) => (
    <span className={`inline-block rounded-full ${statusMeta[status].dot}`} style={{ width: size, height: size }} />
  );

  if (!canFill && !canReview) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <EmptyState title="لا تملك صلاحية الوصول للتقرير اليومي" hint="اطلب من الإدارة منحك صلاحية «التقرير اليومي»." />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <ClipboardList className="text-brand-500" /> التقرير اليومي
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">تقرير يومي من الإدارة للمدير العام — 5 أقسام بحالة سريعة 🟢🟡🔴</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {canFill && (
          <button onClick={() => switchTab('fill')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === 'fill' ? 'bg-white dark:bg-gray-700 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
            <PenLine size={16} /> تعبئة الريبورت
          </button>
        )}
        {canReview && (
          <button onClick={() => switchTab('review')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === 'review' ? 'bg-white dark:bg-gray-700 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
            <Eye size={16} /> المراجعة {reports.length > 0 && <span className="text-xs bg-brand-100 dark:bg-brand-900 text-brand-600 dark:text-brand-300 rounded-full px-1.5">{reports.length}</span>}
          </button>
        )}
      </div>

      {/* ===== FILL TAB ===== */}
      {tab === 'fill' && canFill && (
        <div>
          <PulseBar statuses={REPORT_SECTIONS.map((s) => sections[s.key]?.status || 'green')} />

          <Card className="p-4 mb-4">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">تاريخ التقرير</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full md:w-auto px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500" />
          </Card>

          <div className="space-y-4">
            {REPORT_SECTIONS.map((s) => {
              const cur = sections[s.key];
              return (
                <Card key={s.key} className="p-4">
                  <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                    <div className="flex items-center gap-2 font-bold text-gray-800 dark:text-gray-100">
                      <span className="text-xl">{s.icon}</span> {s.label}
                    </div>
                    <div className="flex gap-1.5">
                      {STATUS_ORDER.map((st) => (
                        <button key={st} type="button" onClick={() => setSectionStatus(s.key, st)}
                          title={statusMeta[st].label}
                          className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all ${
                            cur.status === st ? `ring-2 ${statusMeta[st].ring} scale-110 bg-gray-50 dark:bg-gray-700` : 'opacity-40 hover:opacity-80'}`}>
                          {statusMeta[st].emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Textarea value={cur.text} onChange={(e) => setSectionText(s.key, e.target.value)}
                    placeholder={s.placeholder} rows={2} />
                </Card>
              );
            })}
          </div>

          <Card className="p-4 mt-4">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">ملاحظة عامة (اختياري)</label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="أي حاجة إضافية عايز تقولها للمدير العام..." rows={2} />
          </Card>

          <div className="flex items-center justify-between mt-5 gap-3 flex-wrap">
            <span className="text-xs text-gray-400 flex items-center gap-1"><CheckCircle2 size={14} /> بيتحفظ تلقائي وانت بتملّي</span>
            <Button onClick={submit} disabled={submitting} className="min-w-[160px]">
              <Send size={16} className="ml-1" /> {submitting ? 'جاري الإرسال...' : 'إرسال التقرير'}
            </Button>
          </div>
        </div>
      )}

      {/* ===== REVIEW TAB ===== */}
      {tab === 'review' && canReview && (
        <div>
          {loading ? <LoadingState /> : error ? <ErrorState onRetry={loadReports} /> :
            reports.length === 0 ? <EmptyState title="لا توجد تقارير بعد" hint="التقارير اللي بتتبعت هتظهر هنا (الأحدث فوق)." /> : (
              <div className="space-y-3">
                {reports.map((r) => {
                  const isOpen = expanded === r.id;
                  return (
                    <Card key={r.id} className="overflow-hidden">
                      <button onClick={() => setExpanded(isOpen ? null : r.id)}
                        className="w-full flex items-center gap-3 p-4 text-right hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <StatusDot status={r.overallStatus} size={14} />
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-gray-800 dark:text-gray-100 truncate">{fmtDate(r.date)}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{r.createdByName} • {fmtTime(r.createdAt)}</div>
                        </div>
                        {/* mini pulse */}
                        <div className="hidden sm:flex gap-1">
                          {r.sections.map((sec, i) => <span key={i} className={`w-2.5 h-2.5 rounded-full ${statusMeta[sec.status].dot}`} />)}
                        </div>
                        <ChevronDown size={18} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isOpen && (
                        <div className="border-t border-gray-100 dark:border-gray-700 p-4 space-y-3 bg-gray-50/50 dark:bg-gray-800/30">
                          {REPORT_SECTIONS.map((def) => {
                            const sec = r.sections.find((x) => x.key === def.key);
                            if (!sec) return null;
                            return (
                              <div key={def.key} className="flex gap-3">
                                <StatusDot status={sec.status} />
                                <div className="flex-1">
                                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">{def.icon} {def.label}
                                    <span className={`ml-2 text-xs ${statusMeta[sec.status].text}`}>({statusMeta[sec.status].label})</span>
                                  </div>
                                  <div className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap mt-0.5">{sec.text || <span className="text-gray-400">—</span>}</div>
                                </div>
                              </div>
                            );
                          })}
                          {r.note && (
                            <div className="pt-2 border-t border-gray-100 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300">
                              <span className="font-semibold">ملاحظة: </span>{r.note}
                            </div>
                          )}
                          {canRemove && (
                            <div className="pt-2 flex justify-end">
                              <Button variant="ghost" size="sm" onClick={() => setToDelete(r)}
                                className="!text-rose-600 dark:!text-rose-400 hover:!bg-rose-50 dark:hover:!bg-rose-950/30">
                                <Trash2 size={14} className="ml-1" /> حذف التقرير
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
        </div>
      )}

      <ConfirmDialog isOpen={!!toDelete} onClose={() => setToDelete(null)} onConfirm={confirmDelete}
        title="حذف التقرير" message="متأكد إنك عايز تمسح التقرير ده؟ مش هينفع ترجعه." type="danger" confirmText="حذف" />
    </div>
  );
};

export default DailyReport;
