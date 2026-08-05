import React, { useEffect, useState, useCallback } from 'react';
import { usePermissions } from '../hooks/usePermissions';
import { leaveApi, LeaveBalance, LeaveReq, leaveTypeAr } from '../services/leave';
import { toast } from '../store/toastStore';
import { Card, StatCard, Badge, Button, Input, Textarea } from '../components/ui';
import { LoadingState, ErrorState, EmptyState } from '../components/DataStates';
import { CalendarCheck, CalendarClock, Clock, Send, Check, X, AlertTriangle, Plane } from 'lucide-react';

const statusBadge = (s: string) =>
  s === 'approved' ? <Badge variant="success">مقبول</Badge>
    : s === 'rejected' ? <Badge variant="error">مرفوض</Badge>
      : <Badge variant="warning">قيد المراجعة</Badge>;

const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('ar-EG') : '—';

const LeaveRequests: React.FC = () => {
  const { canWrite } = usePermissions();
  const canApprove = canWrite('leave_requests'); // المدراء + من له الصلاحية

  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [mine, setMine] = useState<LeaveReq[]>([]);
  const [all, setAll] = useState<LeaveReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reviewNote, setReviewNote] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    leaveType: 'annual' as 'annual' | 'emergency' | 'permission',
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

  const pending = all.filter(r => r.status === 'pending');
  const isPermission = form.leaveType === 'permission';

  const reqSummary = (r: LeaveReq) =>
    r.leaveType === 'permission'
      ? `${fmtDate(r.startDate)}${r.startTime ? ` · ${r.startTime}` : ''} · ${r.hours || 0} ساعة`
      : `${fmtDate(r.startDate)} → ${fmtDate(r.endDate)} · ${r.days} يوم`;

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Plane className="h-7 w-7 text-brand-500" /> الأجازات والإذونات
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">رصيدك، تقديم الطلبات، ومتابعة حالتها</p>
      </div>

      {/* الرصيد */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="رصيد سنوي" value={`${balance?.annual ?? '—'} / ${balance?.annualTotal ?? 21}`} icon={<CalendarCheck className="h-6 w-6" />} iconColor="success" />
        <StatCard title="رصيد عارضة" value={`${balance?.emergency ?? '—'} / ${balance?.emergencyTotal ?? 7}`} icon={<CalendarClock className="h-6 w-6" />} iconColor="warning" />
        <StatCard title="إذونات هذا الأسبوع" value={`${balance?.permissionHoursLeft ?? '—'} / ${balance?.permissionHoursTotal ?? 2} ساعة`} icon={<Clock className="h-6 w-6" />} iconColor="info" />
      </div>

      {/* تقديم طلب */}
      <Card>
        <Card.Header><h2 className="font-semibold text-gray-800 dark:text-white">تقديم طلب جديد</h2></Card.Header>
        <Card.Body>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">النوع</label>
                <select
                  value={form.leaveType}
                  onChange={(e) => setForm({ ...form, leaveType: e.target.value as any })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500"
                >
                  <option value="annual">أجازة سنوية</option>
                  <option value="emergency">أجازة عارضة</option>
                  <option value="permission">إذن (ساعات)</option>
                </select>
              </div>
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
            <Textarea label="السبب" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={2} placeholder="سبب الطلب (اختياري)" />
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              <b>القواعد:</b> السنوية لحد 15 يوم متصلة (تقديم قبل شهرين) أو يومين متفرقين/شهر (قبل 48 ساعة) · العارضة يوم واحد/شهر · الإذن ساعتين/أسبوع. القواعد إرشادية والمدير هو اللي يقرر.
            </div>
            <Button type="submit" disabled={submitting} className="gap-2">
              <Send className="h-4 w-4" /> {submitting ? 'جارٍ الإرسال...' : 'إرسال الطلب'}
            </Button>
          </form>
        </Card.Body>
      </Card>

      {loading ? (
        <Card><Card.Body><LoadingState /></Card.Body></Card>
      ) : error ? (
        <Card><Card.Body><ErrorState onRetry={load} /></Card.Body></Card>
      ) : (
        <>
          {/* قسم موافقة المدير */}
          {canApprove && (
            <Card className="border-t-4 border-t-brand-500">
              <Card.Header>
                <h2 className="font-semibold text-gray-800 dark:text-white">طلبات في انتظار الموافقة ({pending.length})</h2>
              </Card.Header>
              <Card.Body className="p-0">
                {pending.length === 0 ? (
                  <EmptyState title="لا توجد طلبات معلّقة" />
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {pending.map((r) => (
                      <div key={r.id} className="p-4 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="font-bold text-gray-900 dark:text-white">{r.employeeName}</span>
                            <span className="mx-2 text-gray-400">·</span>
                            <span className="text-brand-600 dark:text-brand-400">{leaveTypeAr(r.leaveType)}</span>
                          </div>
                          <span className="text-sm text-gray-500 dark:text-gray-400">{reqSummary(r)}</span>
                        </div>
                        {r.reason && <p className="text-sm text-gray-600 dark:text-gray-300">السبب: {r.reason}</p>}
                        {!!r.warnings?.length && (
                          <div className="rounded-lg bg-warning-50 dark:bg-warning-500/10 border border-warning-200 dark:border-warning-500/30 p-2">
                            {r.warnings.map((w, i) => (
                              <p key={i} className="text-xs text-warning-700 dark:text-warning-300 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3 shrink-0" /> {w}
                              </p>
                            ))}
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            value={reviewNote[r.id] || ''}
                            onChange={(e) => setReviewNote({ ...reviewNote, [r.id]: e.target.value })}
                            placeholder="ملاحظة/سبب (اختياري)"
                            className="flex-1 min-w-[160px] rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white"
                          />
                          <Button size="sm" onClick={() => decide(r, 'approved')} className="gap-1"><Check className="h-4 w-4" /> موافقة</Button>
                          <Button size="sm" variant="outline" onClick={() => decide(r, 'rejected')} className="gap-1 text-error-600 border-error-300"><X className="h-4 w-4" /> رفض</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card.Body>
            </Card>
          )}

          {/* طلباتي */}
          <Card>
            <Card.Header><h2 className="font-semibold text-gray-800 dark:text-white">طلباتي ({mine.length})</h2></Card.Header>
            <Card.Body className="p-0">
              {mine.length === 0 ? (
                <EmptyState title="لم تقدّم أي طلبات بعد" />
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {mine.map((r) => (
                    <div key={r.id} className="p-4 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white">{leaveTypeAr(r.leaveType)}</span>
                          {statusBadge(r.status)}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{reqSummary(r)}</p>
                        {r.reviewNotes && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">رد الإدارة: {r.reviewNotes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </>
      )}
    </div>
  );
};

export default LeaveRequests;
