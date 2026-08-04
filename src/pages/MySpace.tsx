import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useDataStore } from '../store/dataStore';
import api from '../services/api';
import { Card, StatCard, Badge, Avatar, Button } from '../components/ui';
import { LoadingState, ErrorState, EmptyState } from '../components/DataStates';
import {
  ClipboardList, Clock, CalendarCheck, CalendarClock, Package,
  Wallet, ChevronLeft, CheckCircle, RefreshCw
} from 'lucide-react';

const empIdOf = (ref: any): string => String(ref?._id || ref?.id || ref || '');

const MySpace: React.FC = () => {
  const { user } = useAuthStore();
  const { employees, tasks, loadEmployees, loadTasks } = useDataStore();
  const [today, setToday] = useState<any>(null);
  const [custody, setCustody] = useState<any[]>([]);
  const [advances, setAdvances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (user) { loadEmployees(); loadTasks(); }
  }, [user, loadEmployees, loadTasks]);

  const me = (employees || []).find((e: any) => empIdOf(e.userId) === String(user?.id));
  const myEmpId = me?.id;

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [t, c, a] = await Promise.all([
        api.get('/attendance-records/today').catch(() => ({ data: null })),
        api.get('/custody').catch(() => ({ data: [] })),
        api.get('/advances').catch(() => ({ data: [] })),
      ]);
      setToday((t.data && (t.data.data ?? t.data)) || null);
      setCustody(Array.isArray(c.data) ? c.data : []);
      setAdvances(Array.isArray(a.data) ? a.data : []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // مهامي الواردة
  const myTasks = (tasks || []).filter((task: any) => myEmpId && empIdOf(task.assignedTo) === String(myEmpId));
  const pendingTasks = myTasks.filter((t: any) => t.status === 'pending' || t.status === 'in_progress');

  const myCustody = (custody || []).filter((c: any) => myEmpId && empIdOf(c.employeeId) === String(myEmpId) && c.status !== 'returned');
  const myAdvances = (advances || []).filter((a: any) => myEmpId && empIdOf(a.employeeId) === String(myEmpId));

  const annual = me?.leaveBalance?.annual ?? 0;
  const emergency = me?.leaveBalance?.emergency ?? 0;

  const attendanceStatus = () => {
    if (!today) return { label: 'لم تسجّل حضور اليوم', color: 'light' as const };
    if (today.checkOut) return { label: 'انصرفت', color: 'info' as const };
    if (today.checkIn) return { label: 'حاضر', color: 'success' as const };
    return { label: today.status === 'absent' ? 'غياب' : 'لم تسجّل', color: 'light' as const };
  };
  const att = attendanceStatus();

  const fmtTime = (d: any) => d ? new Date(d).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-l from-brand-500/10 to-transparent p-5 flex items-center gap-4">
          <Avatar src={(me as any)?.avatar || (user as any)?.avatar} name={user?.name} size="xl" />
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-800 dark:text-white">أهلاً، {user?.name} 👋</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {(me as any)?.position || (user as any)?.position || 'موظف'}
              {(me as any)?.department?.name ? ` · ${(me as any).department.name}` : ''}
            </p>
          </div>
        </div>
      </Card>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="مهام معلّقة" value={String(pendingTasks.length)} icon={<Clock className="h-6 w-6" />} iconColor="warning" />
        <StatCard title="رصيد إجازات سنوية" value={`${annual} يوم`} icon={<CalendarCheck className="h-6 w-6" />} iconColor="success" />
        <StatCard title="رصيد عارضة" value={`${emergency} يوم`} icon={<CalendarClock className="h-6 w-6" />} iconColor="info" />
        <StatCard title="حضور اليوم" value={att.label} icon={<CheckCircle className="h-6 w-6" />} iconColor="primary" />
      </div>

      {loading ? (
        <Card><Card.Body><LoadingState /></Card.Body></Card>
      ) : error ? (
        <Card><Card.Body><ErrorState onRetry={load} /></Card.Body></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Attendance today */}
          <Card>
            <Card.Header>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                  <CalendarCheck className="h-5 w-5 text-brand-500" /> حضور اليوم
                </h2>
                <Badge variant={att.color}>{att.label}</Badge>
              </div>
            </Card.Header>
            <Card.Body>
              <div className="flex items-center justify-around text-center">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">الحضور</p>
                  <p className="text-lg font-bold text-gray-800 dark:text-white">{fmtTime(today?.checkIn)}</p>
                </div>
                <div className="h-10 w-px bg-gray-200 dark:bg-gray-700" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">الانصراف</p>
                  <p className="text-lg font-bold text-gray-800 dark:text-white">{fmtTime(today?.checkOut)}</p>
                </div>
              </div>
              <Link to="/attendance-map" className="mt-4 block">
                <Button variant="outline" className="w-full">
                  <RefreshCw className="h-4 w-4" /> تسجيل الحضور
                </Button>
              </Link>
            </Card.Body>
          </Card>

          {/* My tasks */}
          <Card>
            <Card.Header>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-brand-500" /> مهامي ({myTasks.length})
                </h2>
                <Link to="/tasks" className="text-sm text-brand-500 hover:underline flex items-center gap-1">
                  الكل <ChevronLeft className="h-4 w-4" />
                </Link>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              {myTasks.length === 0 ? (
                <EmptyState title="لا توجد مهام واردة" icon={<ClipboardList className="h-8 w-8" />} />
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {myTasks.slice(0, 5).map((t: any) => (
                    <Link to="/tasks" key={t.id} className="flex items-center justify-between gap-2 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/40">
                      <span className="text-sm text-gray-700 dark:text-gray-200 truncate">{t.title}</span>
                      <Badge variant={t.status === 'completed' ? 'success' : t.status === 'in_progress' ? 'info' : 'light'}>
                        {t.status === 'completed' ? 'مكتملة' : t.status === 'in_progress' ? 'قيد التنفيذ' : 'معلقة'}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Custody */}
          <Card>
            <Card.Header>
              <h2 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <Package className="h-5 w-5 text-brand-500" /> عهدي ({myCustody.length})
              </h2>
            </Card.Header>
            <Card.Body className="p-0">
              {myCustody.length === 0 ? (
                <EmptyState title="لا توجد عهد مسجّلة عليك" icon={<Package className="h-8 w-8" />} />
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {myCustody.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between gap-2 px-4 py-3">
                      <span className="text-sm text-gray-700 dark:text-gray-200 truncate">{c.itemName}</span>
                      <Badge variant="light">{c.type === 'financial' ? `${c.amount || 0} ${c.currency || ''}` : 'عينية'}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Advances */}
          <Card>
            <Card.Header>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-brand-500" /> سلفي ({myAdvances.length})
                </h2>
                <Link to="/custody" className="text-sm text-brand-500 hover:underline flex items-center gap-1">
                  الكل <ChevronLeft className="h-4 w-4" />
                </Link>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              {myAdvances.length === 0 ? (
                <EmptyState title="لا توجد سلف" icon={<Wallet className="h-8 w-8" />} />
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {myAdvances.slice(0, 5).map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between gap-2 px-4 py-3">
                      <span className="text-sm text-gray-700 dark:text-gray-200 truncate">{a.amount} {a.currency || ''} — {a.reason}</span>
                      <Badge variant={a.status === 'approved' || a.status === 'paid' ? 'success' : a.status === 'rejected' ? 'error' : 'warning'}>
                        {a.status === 'approved' ? 'مقبولة' : a.status === 'paid' ? 'مصروفة' : a.status === 'rejected' ? 'مرفوضة' : 'قيد المراجعة'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </div>
      )}
    </div>
  );
};

export default MySpace;
