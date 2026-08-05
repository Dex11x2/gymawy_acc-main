import React, { useEffect, useState, useCallback } from 'react';
import { usePermissions } from '../hooks/usePermissions';
import { leaveApi, LeaveBalance, LeaveReq, leaveTypeAr } from '../services/leave';
import { toast } from '../store/toastStore';
import { Card, Button, Input, Textarea } from '../components/ui';
import { LoadingState, ErrorState, EmptyState } from '../components/DataStates';
import {
  CalendarCheck, CalendarClock, Clock, Send, Check, X, AlertTriangle, Plane,
  Inbox, Hourglass, ClipboardList,
} from 'lucide-react';

const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const initials = (name?: string) => (name || '؟').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('');

type LeaveType = 'annual' | 'emergency' | 'permission';

const TYPES: { key: LeaveType; label: string; icon: React.ElementType; hint: string; accent: string; ring: string; soft: string }[] = [
  { key: 'annual', label: 'أجازة سنوية', icon: CalendarCheck, hint: '21 يوم/سنة', accent: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-500 border-emerald-500', soft: 'bg-emerald-50 dark:bg-emerald-500/10' },
  { key: 'emergency', label: 'أجازة عارضة', icon: CalendarClock, hint: '7 أيام/سنة', accent: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-500 border-amber-500', soft: 'bg-amber-50 dark:bg-amber-500/10' },
  { key: 'permission', label: 'إذن (ساعات)', icon: Clock, hint: 'ساعتين/أسبوع', accent: 'text-sky-600 dark:text-sky-400', ring: 'ring-sky-500 border-sky-500', soft: 'bg-sky-50 dark:bg-sky-500/10' },
];

// كارت رصيد فيه بار تقدّم
const BalanceCard: React.FC<{
  title: string; remaining: number | null; total: number; unit: string;
  icon: React.ElementType; theme: 'emerald' | 'amber' | 'sky';
}> = ({ title, remaining, total, unit, icon: Icon, theme }) => {
  const themes = {
    emerald: { bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', iconBg: 'bg-emerald-100 dark:bg-emerald-500/15', ringTrack: 'bg-emerald-100 dark:bg-emerald-500/10' },
    amber: { bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', iconBg: 'bg-amber-100 dark:bg-amber-500/15', ringTrack: 'bg-amber-100 dark:bg-amber-500/10' },
    sky: { bar: 'bg-sky-500', text: 'text-sky-600 dark:text-sky-400', iconBg: 'bg-sky-100 dark:bg-sky-500/15', ringTrack: 'bg-sky-100 dark:bg-sky-500/10' },
  }[theme];
  const rem = remaining ?? 0;
  const pct = total > 0 ? Math.max(0, Math.min(100, (rem / total) * 100)) : 0;
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">{title}</span>
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${themes.iconBg} ${themes.text}`}><Icon className="h-5 w-5" /></span>
      </div>
      <div className="flex items-baseline gap-1.5 mb-3">
        <span className={`text-3xl font-extrabold ${themes.text}`}>{remaining ?? '—'}</span>
        <span className="text-sm text-gray-400">/ {total} {unit}</span>
      </div>
      <div className={`h-2 rounded-full overflow-hidden ${themes.ringTrack}`}>
        <div className={`h-full rounded-full ${themes.bar} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[11px] text-gray-400 mt-1.5">المتبقّي من إجمالي {total} {unit}</p>
    </div>
  );
};

const statusChip = (s: string) => {
  const map: Record<string, { label: string; cls: string; dot: string }> = {
    approved: { label: 'مقبول', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300', dot: 'bg-emerald-500' },
    rejected: { label: 'مرفوض', cls: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300', dot: 'bg-rose-500' },
    pending: { label: 'قيد المراجعة', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300', dot: 'bg-amber-500' },
  };
  const m = map[s] || map.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${m.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} /> {m.label}
    </span>
  );
};

const typeMeta = (t: string) => TYPES.find((x) => x.key === t) || TYPES[0];

const LeaveRequests: React.FC = () => {
  const { canWrite } = usePermissions();
  const canApprove = canWrite('leave_requests'); // المدراء + من له صلاحية الموافقة

  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [mine, setMine] = useState<LeaveReq[]>([]);
  const [all, setAll] = useState<LeaveReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reviewNote, setReviewNote] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    leaveType: 'annual' as LeaveType,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    hours: 1 as number,
    startTime: '',
    reason: '',
  });

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const [bal, my] = await Promise.all([
        leaveApi.myBalance().catch(() => null),
        leaveApi.mine().catch(() => []),
      ]);
      setBalance(bal);
      setMine(my);
      if (canApprove) setAll(await leaveApi.all().catch(() => []));
    } catch { setError(true); }
    finally { setLoading(false); }
  }, [canApprove]);

  useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: any = { leaveType: form.leaveType, startDate: form.startDate, reason: form.reason };
      if (form.leaveType === 'permission') { payload.hours = Number(form.hours); payload.startTime = form.startTime; }
      else { payload.endDate = form.endDate; }
      await leaveApi.create(payload);
      toast('تم إرسال الطلب — في انتظار الموافقة', 'success');
      setForm({ ...form, reason: '' });
      load();
    } catch (err: any) {
      toast(err?.response?.data?.message || 'تعذّر إرسال الطلب', 'error');
    } finally { setSubmitting(false); }
  };

  const decide = async (r: LeaveReq, status: 'approved' | 'rejected') => {
    try {
      await leaveApi.setStatus(r.id, status, reviewNote[r.id]);
      toast(status === 'approved' ? 'تمت الموافقة' : 'تم الرفض', 'success');
      load();
    } catch (err: any) {
      toast(err?.response?.data?.message || 'تعذّر تنفيذ الإجراء', 'error');
    }
  };

  const pending = all.filter((r) => r.status === 'pending');
  const isPermission = form.leaveType === 'permission';

  const reqSummary = (r: LeaveReq) =>
    r.leaveType === 'permission'
      ? `${fmtDate(r.startDate)}${r.startTime ? ` · ${r.startTime}` : ''} · ${r.hours || 0} ساعة`
      : `${fmtDate(r.startDate)} → ${fmtDate(r.endDate)} · ${r.days} يوم`;

  // الرصيد السياقي للنوع المختار
  const ctxBalance = () => {
    if (!balance) return null;
    if (form.leaveType === 'annual') return { rem: balance.annual, total: balance.annualTotal, unit: 'يوم' };
    if (form.leaveType === 'emergency') return { rem: balance.emergency, total: balance.emergencyTotal, unit: 'يوم' };
    return { rem: balance.permissionHoursLeft, total: balance.permissionHoursTotal, unit: 'ساعة' };
  };
  const ctx = ctxBalance();

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-1" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Plane className="h-7 w-7 text-brand-500" /> الأجازات والإذونات
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">شوف رصيدك، قدّم طلب، وتابع حالته — كل ده من هنا</p>
      </div>

      {/* الرصيد */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <BalanceCard title="الرصيد السنوي" remaining={balance?.annual ?? null} total={balance?.annualTotal ?? 21} unit="يوم" icon={CalendarCheck} theme="emerald" />
        <BalanceCard title="رصيد العارضة" remaining={balance?.emergency ?? null} total={balance?.emergencyTotal ?? 7} unit="يوم" icon={CalendarClock} theme="amber" />
        <BalanceCard title="إذونات هذا الأسبوع" remaining={balance?.permissionHoursLeft ?? null} total={balance?.permissionHoursTotal ?? 2} unit="ساعة" icon={Clock} theme="sky" />
      </div>

      {/* قسم موافقة المُعتمِد (فوق وواضح) */}
      {canApprove && (
        <Card className="border-t-4 border-t-brand-500 overflow-hidden">
          <Card.Header className="flex items-center justify-between">
            <h2 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <Inbox className="h-5 w-5 text-brand-500" /> طلبات في انتظار موافقتك
            </h2>
            {pending.length > 0 && (
              <span className="rounded-full bg-brand-500 text-white text-xs font-bold px-2.5 py-1">{pending.length}</span>
            )}
          </Card.Header>
          <Card.Body className="p-0">
            {loading ? <div className="p-6"><LoadingState /></div> : pending.length === 0 ? (
              <EmptyState title="مفيش طلبات معلّقة" hint="أي طلب جديد هيظهر هنا فورًا." />
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {pending.map((r) => {
                  const tm = typeMeta(r.leaveType);
                  return (
                    <div key={r.id} className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <span className="w-10 h-10 shrink-0 rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-300 flex items-center justify-center font-bold text-sm">{initials(r.employeeName)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="font-bold text-gray-900 dark:text-white">{r.employeeName}</span>
                            <span className={`inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5 ${tm.soft} ${tm.accent}`}>
                              <tm.icon className="h-3 w-3" /> {leaveTypeAr(r.leaveType)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{reqSummary(r)}</p>
                          {r.reason && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">💬 {r.reason}</p>}
                        </div>
                      </div>
                      {!!r.warnings?.length && (
                        <div className="rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 p-2.5 space-y-1">
                          {r.warnings.map((w, i) => (
                            <p key={i} className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {w}
                            </p>
                          ))}
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          value={reviewNote[r.id] || ''}
                          onChange={(e) => setReviewNote({ ...reviewNote, [r.id]: e.target.value })}
                          placeholder="ملاحظة أو سبب (اختياري)"
                          className="flex-1 min-w-[160px] rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500"
                        />
                        <Button size="sm" onClick={() => decide(r, 'approved')} className="gap-1"><Check className="h-4 w-4" /> موافقة</Button>
                        <Button size="sm" variant="outline" onClick={() => decide(r, 'rejected')} className="gap-1 !text-rose-600 !border-rose-300 dark:!text-rose-400 hover:!bg-rose-50 dark:hover:!bg-rose-950/30"><X className="h-4 w-4" /> رفض</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card.Body>
        </Card>
      )}

      {/* عمودين: تقديم طلب + طلباتي */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* تقديم طلب */}
        <Card>
          <Card.Header><h2 className="font-bold text-gray-800 dark:text-white flex items-center gap-2"><Send className="h-5 w-5 text-brand-500" /> تقديم طلب جديد</h2></Card.Header>
          <Card.Body>
            <form onSubmit={submit} className="space-y-4">
              {/* اختيار النوع بأزرار */}
              <div className="grid grid-cols-3 gap-2">
                {TYPES.map((t) => {
                  const active = form.leaveType === t.key;
                  return (
                    <button key={t.key} type="button" onClick={() => setForm({ ...form, leaveType: t.key })}
                      className={`rounded-xl border p-3 text-center transition-all ${active ? `${t.soft} ring-2 ${t.ring}` : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                      <t.icon className={`h-5 w-5 mx-auto mb-1 ${active ? t.accent : 'text-gray-400'}`} />
                      <div className={`text-xs font-bold ${active ? t.accent : 'text-gray-600 dark:text-gray-300'}`}>{t.label.replace('أجازة ', '').replace(' (ساعات)', '')}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{t.hint}</div>
                    </button>
                  );
                })}
              </div>

              {/* الرصيد السياقي */}
              {ctx && (
                <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 flex items-center justify-between">
                  <span>رصيدك المتاح لهذا النوع</span>
                  <span className="font-bold text-gray-900 dark:text-white">{ctx.rem ?? '—'} <span className="text-xs text-gray-400 font-normal">/ {ctx.total} {ctx.unit}</span></span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input type="date" label={isPermission ? 'يوم الإذن' : 'من تاريخ'} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
                {isPermission ? (
                  <Input type="time" label="الوقت (اختياري)" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
                ) : (
                  <Input type="date" label="إلى تاريخ" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
                )}
              </div>
              {isPermission && (
                <Input type="number" label="عدد الساعات" min="0.5" step="0.5" max="8" value={form.hours} onChange={(e) => setForm({ ...form, hours: Number(e.target.value) })} required />
              )}
              <Textarea label="السبب (اختياري)" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={2} placeholder="اكتب سبب الطلب لو حابب..." />

              <details className="rounded-lg bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-500 dark:text-gray-400">
                <summary className="cursor-pointer select-none px-3 py-2 font-semibold flex items-center gap-1.5"><ClipboardList className="h-3.5 w-3.5" /> قواعد الأجازات (اضغط للعرض)</summary>
                <div className="px-3 pb-3 leading-relaxed space-y-1">
                  <p>• <b>السنوية:</b> لحد 15 يوم متصلة (تقديم قبل شهرين) أو يومين متفرقين/شهر (قبل 48 ساعة).</p>
                  <p>• <b>العارضة:</b> يوم واحد كحد أقصى في الشهر.</p>
                  <p>• <b>الإذن:</b> ساعتين في الأسبوع (ممكن تتقسّم).</p>
                  <p className="text-gray-400">القواعد إرشادية — المُعتمِد هو اللي يقرر في النهاية.</p>
                </div>
              </details>

              <Button type="submit" disabled={submitting} className="w-full gap-2">
                <Send className="h-4 w-4" /> {submitting ? 'جارٍ الإرسال...' : 'إرسال الطلب'}
              </Button>
            </form>
          </Card.Body>
        </Card>

        {/* طلباتي */}
        <Card>
          <Card.Header className="flex items-center justify-between">
            <h2 className="font-bold text-gray-800 dark:text-white flex items-center gap-2"><Hourglass className="h-5 w-5 text-brand-500" /> طلباتي</h2>
            {mine.length > 0 && <span className="text-xs text-gray-400">{mine.length} طلب</span>}
          </Card.Header>
          <Card.Body className="p-0">
            {loading ? <div className="p-6"><LoadingState /></div> : error ? <div className="p-6"><ErrorState onRetry={load} /></div> :
              mine.length === 0 ? <EmptyState title="لسه مقدمتش أي طلب" hint="قدّم أول طلب من الفورم على الجنب." /> : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {mine.map((r) => {
                    const tm = typeMeta(r.leaveType);
                    const borderCls = r.status === 'approved' ? 'border-r-emerald-500' : r.status === 'rejected' ? 'border-r-rose-500' : 'border-r-amber-500';
                    return (
                      <div key={r.id} className={`p-4 border-r-4 ${borderCls}`}>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1.5 text-sm font-bold ${tm.accent}`}>
                            <tm.icon className="h-4 w-4" /> {leaveTypeAr(r.leaveType)}
                          </span>
                          {statusChip(r.status)}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{reqSummary(r)}</p>
                        {r.reason && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">💬 {r.reason}</p>}
                        {r.reviewNotes && (
                          <p className="text-xs mt-1.5 rounded-md bg-gray-50 dark:bg-gray-800/50 px-2 py-1 text-gray-600 dark:text-gray-300">
                            رد الإدارة{r.reviewedByName ? ` (${r.reviewedByName})` : ''}: {r.reviewNotes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
          </Card.Body>
        </Card>
      </div>
    </div>
  );
};

export default LeaveRequests;
