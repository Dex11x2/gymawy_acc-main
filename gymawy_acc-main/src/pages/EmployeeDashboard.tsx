import React, { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useDataStore } from '../store/dataStore';
import { useNotificationStore } from '../store/notificationStore';
import { Card, StatCard, Badge } from '../components/ui';
import {
  CheckCircle,
  XCircle,
  CheckSquare,
  Star,
  Clock,
  Timer,
  BarChart3,
  Bell,
  ListTodo,
  Calendar
} from 'lucide-react';

const EmployeeDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { tasks, loadTasks } = useDataStore();
  const { notifications, loadNotifications } = useNotificationStore();

  useEffect(() => {
    loadTasks();
    loadNotifications();
  }, []);

  const myTasks = tasks.filter(t => t.assignedTo === user?.id);
  const myNotifications = notifications.filter(n => n.userId === user?.id).slice(0, 5);

  // حساب الإحصائيات من البيانات المحلية
  const stats = {
    attendanceDays: 0,
    absenceDays: 0,
    tasksCompleted: myTasks.filter(t => t.status === 'completed').length,
    tasksPending: myTasks.filter(t => t.status !== 'completed').length,
    averageRating: 0,
    onlineTime: '0 ساعة',
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success" size="sm">مكتملة</Badge>;
      case 'in_progress':
        return <Badge variant="info" size="sm">قيد التنفيذ</Badge>;
      default:
        return <Badge variant="light" size="sm">جديدة</Badge>;
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <Card className="bg-gradient-to-r from-brand-500 to-brand-600 border-0">
        <Card.Body className="p-6">
          <h1 className="text-2xl lg:text-3xl font-bold text-white">مرحباً، {user?.name}</h1>
          <p className="mt-2 text-white/80">لوحة التحكم الخاصة بك</p>
        </Card.Body>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatCard
          title="أيام الحضور"
          value={stats.attendanceDays.toString()}
          icon={<CheckCircle className="w-6 h-6" />}
          iconColor="success"
        />
        <StatCard
          title="أيام الغياب"
          value={stats.absenceDays.toString()}
          icon={<XCircle className="w-6 h-6" />}
          iconColor="error"
        />
        <StatCard
          title="المهام المكتملة"
          value={stats.tasksCompleted.toString()}
          icon={<CheckSquare className="w-6 h-6" />}
          iconColor="info"
        />
        <StatCard
          title="التقييم"
          value={`${stats.averageRating.toFixed(1)}`}
          icon={<Star className="w-6 h-6" />}
          iconColor="warning"
          subtitle="من 5"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* المهام */}
        <Card>
          <Card.Header>
            <div className="flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-brand-500" />
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">مهامي</h2>
            </div>
          </Card.Header>
          <Card.Body>
            {myTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                  <ListTodo className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 dark:text-gray-400">لا توجد مهام حالياً</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myTasks.slice(0, 5).map(task => (
                  <div key={task.id} className="border-r-4 border-brand-500 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-800 dark:text-white">{task.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">{task.description}</p>
                    <div className="flex items-center justify-between mt-3">
                      {getStatusBadge(task.status)}
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(task.dueDate).toLocaleDateString('ar-EG')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card.Body>
        </Card>

        {/* الإشعارات */}
        <Card>
          <Card.Header>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-brand-500" />
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">الإشعارات</h2>
            </div>
          </Card.Header>
          <Card.Body>
            {myNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                  <Bell className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 dark:text-gray-400">لا توجد إشعارات جديدة</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myNotifications.map(notif => (
                  <div key={notif.id} className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                    <h3 className="font-medium text-gray-800 dark:text-white">{notif.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{notif.message}</p>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-2 block flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(notif.createdAt).toLocaleString('ar-EG')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card.Body>
        </Card>
      </div>

      {/* معلومات إضافية */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* وقت الاستخدام */}
        <Card>
          <Card.Body>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-info-100 dark:bg-info-900/30 rounded-xl flex items-center justify-center">
                <Timer className="w-5 h-5 text-info-600 dark:text-info-400" />
              </div>
              <h3 className="font-semibold text-gray-800 dark:text-white">وقت الاستخدام</h3>
            </div>
            <p className="text-3xl font-bold text-info-600 dark:text-info-400">{stats.onlineTime}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">هذا الشهر</p>
          </Card.Body>
        </Card>

        {/* المهام المعلقة */}
        <Card>
          <Card.Body>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-warning-100 dark:bg-warning-900/30 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-warning-600 dark:text-warning-400" />
              </div>
              <h3 className="font-semibold text-gray-800 dark:text-white">المهام المعلقة</h3>
            </div>
            <p className="text-3xl font-bold text-warning-600 dark:text-warning-400">{stats.tasksPending}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">تحتاج للإنجاز</p>
          </Card.Body>
        </Card>

        {/* ملخص الأداء */}
        <Card>
          <Card.Body>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-brand-100 dark:bg-brand-900/30 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              </div>
              <h3 className="font-semibold text-gray-800 dark:text-white">ملخص الأداء</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">الحضور:</span>
                <span className="font-semibold text-success-600 dark:text-success-400">
                  {stats.attendanceDays > 0 ?
                    `${((stats.attendanceDays / (stats.attendanceDays + stats.absenceDays)) * 100).toFixed(0)}%`
                    : '0%'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">إنجاز المهام:</span>
                <span className="font-semibold text-info-600 dark:text-info-400">
                  {stats.tasksCompleted > 0 ?
                    `${((stats.tasksCompleted / (stats.tasksCompleted + stats.tasksPending)) * 100).toFixed(0)}%`
                    : '0%'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">التقييم:</span>
                <span className="font-semibold text-warning-600 dark:text-warning-400">{stats.averageRating.toFixed(1)}/5</span>
              </div>
            </div>
          </Card.Body>
        </Card>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
