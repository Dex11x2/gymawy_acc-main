import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useDataStore } from '../store/dataStore';
import { DevTask } from '../types';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  User,
  FileText,
  PlayCircle,
  Eye,
  Edit2,
  Trash2,
  MessageSquare,
  CheckCircle,
  XCircle,
  HelpCircle,
  AlertTriangle,
  Timer,
  Plus,
  Download,
  FileDown,
  Search,
  ListFilter
} from 'lucide-react';
import CustomDropdown from '../components/CustomDropdown';
import { usePermissions } from '../hooks/usePermissions';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Toast from '../components/Toast';
import { useSettingsStore } from '../store/settingsStore';
import { Card, StatCard, Badge, Button, Input, Textarea, Avatar } from '../components/ui';

interface ToastState {
  show: boolean;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

const DevTasks: React.FC = () => {
  const { user } = useAuthStore();
  const {
    devTasks = [],
    employees = [],
    loadDevTasks,
    loadEmployees,
    addDevTask,
    updateDevTask,
    deleteDevTask,
    updateDevTaskStatus,
    updateDevTaskTestingStatus,
    addDevTaskComment
  } = useDataStore();

  const { language } = useSettingsStore();
  const { canWrite, canDelete } = usePermissions();
  const isRTL = language === 'ar';
  const locale = isRTL ? ar : enUS;

  // State
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<DevTask | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>({ show: false, type: 'success', message: '' });
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'testing' | 'completed' | 'blocked'>('all');
  const [testingFilter, setTestingFilter] = useState<'all' | 'not_tested' | 'testing' | 'passed' | 'failed'>('all');
  const [deploymentFilter, setDeploymentFilter] = useState<'all' | 'ready' | 'not_ready'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTask, setSelectedTask] = useState<DevTask | null>(null);
  const [commentText, setCommentText] = useState('');
  const [activeTab, setActiveTab] = useState<'my' | 'all'>('my');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 5 as number,
    status: 'pending' as DevTask['status'],
    startDate: '',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    testingStatus: 'not_tested' as DevTask['testingStatus'],
    testingNotes: '',
    deploymentReady: false,
    tags: [] as string[],
  });

  const [tagInput, setTagInput] = useState('');

  // Load data on mount
  useEffect(() => {
    if (user) {
      loadDevTasks();
      loadEmployees();
    }
  }, [user]);

  // Real-time updates
  useEffect(() => {
    const socket = (window as any).socket;
    if (!socket) return;

    const handleTaskUpdate = () => {
      loadDevTasks();
    };

    socket.on('dev-task-updated', handleTaskUpdate);
    socket.on('dev-task-created', handleTaskUpdate);
    socket.on('dev-task-deleted', handleTaskUpdate);
    socket.on('dev-task-comment', handleTaskUpdate);

    return () => {
      socket.off('dev-task-updated', handleTaskUpdate);
      socket.off('dev-task-created', handleTaskUpdate);
      socket.off('dev-task-deleted', handleTaskUpdate);
      socket.off('dev-task-comment', handleTaskUpdate);
    };
  }, []);

  // Filter tasks
  const filteredTasks = devTasks.filter(task => {
    if (activeTab === 'my' && task.assignedTo !== user?.id) {
      return false;
    }
    if (statusFilter !== 'all' && task.status !== statusFilter) {
      return false;
    }
    if (testingFilter !== 'all' && task.testingStatus !== testingFilter) {
      return false;
    }
    if (deploymentFilter === 'ready' && !task.deploymentReady) {
      return false;
    }
    if (deploymentFilter === 'not_ready' && task.deploymentReady) {
      return false;
    }
    if (searchTerm && !task.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !task.description.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !(task.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))) {
      return false;
    }
    return true;
  });

  // Statistics
  const stats = {
    total: devTasks.length,
    pending: devTasks.filter(t => t.status === 'pending').length,
    inProgress: devTasks.filter(t => t.status === 'in_progress').length,
    testing: devTasks.filter(t => t.status === 'testing').length,
    completed: devTasks.filter(t => t.status === 'completed').length,
    blocked: devTasks.filter(t => t.status === 'blocked').length,
    deploymentReady: devTasks.filter(t => t.deploymentReady).length,
    testsPassed: devTasks.filter(t => t.testingStatus === 'passed').length,
    overdue: devTasks.filter(t =>
      t.status !== 'completed' &&
      new Date(t.dueDate) < new Date()
    ).length,
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title) {
      setToast({
        show: true,
        type: 'error',
        message: isRTL ? 'يرجى إدخال عنوان المهمة' : 'Please enter task title'
      });
      return;
    }

    if (!formData.description) {
      setToast({
        show: true,
        type: 'error',
        message: isRTL ? 'يرجى إدخال وصف المهمة' : 'Please enter task description'
      });
      return;
    }

    try {
      if (editingTask) {
        await updateDevTask(editingTask.id, {
          ...formData,
          assignedTo: editingTask.assignedTo,
          startDate: formData.startDate ? new Date(formData.startDate) : undefined,
          dueDate: new Date(formData.dueDate),
          tags: formData.tags,
        });
        setToast({
          show: true,
          type: 'success',
          message: isRTL ? 'تم تحديث المهمة بنجاح' : 'Task updated successfully'
        });
      } else {
        const taskToAdd = {
          ...formData,
          assignedTo: user?.id || '',
          assignedBy: user?.id || '',
          startDate: formData.startDate ? new Date(formData.startDate) : undefined,
          dueDate: new Date(formData.dueDate),
          comments: [],
          tags: formData.tags,
          attachments: [],
          modifications: [],
        };
        await addDevTask(taskToAdd);
        setToast({
          show: true,
          type: 'success',
          message: isRTL ? 'تم إضافة المهمة بنجاح' : 'Task added successfully'
        });
      }

      handleCloseModal();
      loadDevTasks();
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      setToast({
        show: true,
        type: 'error',
        message: isRTL ? 'حدث خطأ أثناء حفظ المهمة' : 'Error saving task'
      });
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTask(null);
    setFormData({
      title: '',
      description: '',
      priority: 5,
      status: 'pending',
      startDate: '',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      testingStatus: 'not_tested',
      testingNotes: '',
      deploymentReady: false,
      tags: [],
    });
    setTagInput('');
  };

  const handleEdit = (task: DevTask) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      startDate: task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : '',
      dueDate: new Date(task.dueDate).toISOString().split('T')[0],
      testingStatus: task.testingStatus,
      testingNotes: task.testingNotes || '',
      deploymentReady: task.deploymentReady,
      tags: task.tags || [],
    });
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await deleteDevTask(deleteId);
      setToast({
        show: true,
        type: 'success',
        message: isRTL ? 'تم حذف المهمة بنجاح' : 'Task deleted successfully'
      });
      setDeleteId(null);
    } catch (error) {
      setToast({
        show: true,
        type: 'error',
        message: isRTL ? 'حدث خطأ أثناء حذف المهمة' : 'Error deleting task'
      });
    }
  };

  const handleStatusChange = async (taskId: string, status: DevTask['status']) => {
    try {
      await updateDevTaskStatus(taskId, status);
      setToast({
        show: true,
        type: 'success',
        message: isRTL ? 'تم تحديث الحالة بنجاح' : 'Status updated successfully'
      });
    } catch (error) {
      setToast({
        show: true,
        type: 'error',
        message: isRTL ? 'حدث خطأ أثناء تحديث الحالة' : 'Error updating status'
      });
    }
  };

  const handleTestingStatusChange = async (taskId: string, testingStatus: DevTask['testingStatus'], notes?: string) => {
    try {
      await updateDevTaskTestingStatus(taskId, testingStatus, notes);
      setToast({
        show: true,
        type: 'success',
        message: isRTL ? 'تم تحديث حالة الاختبار بنجاح' : 'Testing status updated successfully'
      });
    } catch (error) {
      setToast({
        show: true,
        type: 'error',
        message: isRTL ? 'حدث خطأ أثناء تحديث حالة الاختبار' : 'Error updating testing status'
      });
    }
  };

  const handleAddComment = async () => {
    if (!selectedTask || !commentText.trim()) return;

    try {
      await addDevTaskComment(selectedTask.id, commentText);
      setCommentText('');
      setToast({
        show: true,
        type: 'success',
        message: isRTL ? 'تم إضافة التعليق بنجاح' : 'Comment added successfully'
      });
      loadDevTasks();
    } catch (error) {
      setToast({
        show: true,
        type: 'error',
        message: isRTL ? 'حدث خطأ أثناء إضافة التعليق' : 'Error adding comment'
      });
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  // Generate weekly report
  const generateWeeklyReport = () => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const weeklyTasks = filteredTasks.filter(task => {
      const taskDate = new Date(task.updatedAt);
      return taskDate >= weekAgo;
    });

    const completedThisWeek = weeklyTasks.filter(t =>
      t.status === 'completed' && t.completedDate && new Date(t.completedDate) >= weekAgo
    ).length;
    const newTasksThisWeek = weeklyTasks.filter(t =>
      new Date(t.createdAt) >= weekAgo
    ).length;
    const inProgressCount = weeklyTasks.filter(t => t.status === 'in_progress').length;
    const blockedCount = weeklyTasks.filter(t => t.status === 'blocked').length;

    const reportTitle = isRTL ? 'تقرير المهام الأسبوعي' : 'Weekly Tasks Report';
    const dateRange = `${format(weekAgo, 'dd/MM/yyyy')} - ${format(now, 'dd/MM/yyyy')}`;

    let reportContent = `${reportTitle}\n`;
    reportContent += `${'='.repeat(50)}\n`;
    reportContent += `${isRTL ? 'التاريخ:' : 'Date:'} ${dateRange}\n\n`;

    reportContent += `${isRTL ? 'الإحصائيات الأسبوعية:' : 'Weekly Statistics:'}\n`;
    reportContent += `${'-'.repeat(30)}\n`;
    reportContent += `${isRTL ? 'مهام جديدة:' : 'New Tasks:'} ${newTasksThisWeek}\n`;
    reportContent += `${isRTL ? 'مهام مكتملة:' : 'Completed:'} ${completedThisWeek}\n`;
    reportContent += `${isRTL ? 'قيد التنفيذ:' : 'In Progress:'} ${inProgressCount}\n`;
    reportContent += `${isRTL ? 'متوقفة:' : 'Blocked:'} ${blockedCount}\n\n`;

    const completedTasks = weeklyTasks.filter(t => t.status === 'completed');
    if (completedTasks.length > 0) {
      reportContent += `${isRTL ? 'المهام المكتملة:' : 'Completed Tasks:'}\n`;
      reportContent += `${'-'.repeat(30)}\n`;
      completedTasks.forEach(task => {
        reportContent += `- ${task.title}\n`;
        if (task.completedDate) {
          reportContent += `  ${isRTL ? 'تاريخ الإكمال:' : 'Completed:'} ${format(new Date(task.completedDate), 'dd/MM/yyyy')}\n`;
        }
      });
      reportContent += '\n';
    }

    const progressTasks = weeklyTasks.filter(t => t.status === 'in_progress' || t.status === 'testing');
    if (progressTasks.length > 0) {
      reportContent += `${isRTL ? 'المهام قيد التنفيذ:' : 'In Progress Tasks:'}\n`;
      reportContent += `${'-'.repeat(30)}\n`;
      progressTasks.forEach(task => {
        reportContent += `- ${task.title}\n`;
        reportContent += `  ${isRTL ? 'الحالة:' : 'Status:'} ${getStatusText(task.status)}\n`;
        reportContent += `  ${isRTL ? 'الموعد النهائي:' : 'Due:'} ${format(new Date(task.dueDate), 'dd/MM/yyyy')}\n`;
      });
      reportContent += '\n';
    }

    const blockedTasks = weeklyTasks.filter(t => t.status === 'blocked');
    if (blockedTasks.length > 0) {
      reportContent += `${isRTL ? 'المهام المتوقفة:' : 'Blocked Tasks:'}\n`;
      reportContent += `${'-'.repeat(30)}\n`;
      blockedTasks.forEach(task => {
        reportContent += `- ${task.title}\n`;
        if (task.testingNotes) {
          reportContent += `  ${isRTL ? 'السبب:' : 'Reason:'} ${task.testingNotes}\n`;
        }
      });
    }

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `weekly-tasks-report-${format(now, 'yyyy-MM-dd')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setToast({
      show: true,
      type: 'success',
      message: isRTL ? 'تم تنزيل التقرير الأسبوعي' : 'Weekly report downloaded'
    });
  };

  // Export to CSV function
  const exportToCSV = () => {
    const headers = [
      isRTL ? 'العنوان' : 'Title',
      isRTL ? 'الوصف' : 'Description',
      isRTL ? 'الأولوية' : 'Priority',
      isRTL ? 'الحالة' : 'Status',
      isRTL ? 'حالة الاختبار' : 'Testing Status',
      isRTL ? 'تاريخ البداية' : 'Start Date',
      isRTL ? 'تاريخ النهاية' : 'Due Date',
      isRTL ? 'جاهز للنشر' : 'Deployment Ready',
      isRTL ? 'العلامات' : 'Tags',
    ];

    const rows = filteredTasks.map(task => [
      task.title,
      task.description,
      task.priority,
      task.status,
      task.testingStatus,
      task.startDate ? format(new Date(task.startDate), 'yyyy-MM-dd') : '',
      format(new Date(task.dueDate), 'yyyy-MM-dd'),
      task.deploymentReady ? (isRTL ? 'نعم' : 'Yes') : (isRTL ? 'لا' : 'No'),
      task.tags?.join(', ') || '',
    ]);

    const BOM = '\uFEFF';
    const csvContent = BOM +
      headers.join(',') + '\n' +
      rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `dev-tasks-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();

    setToast({
      show: true,
      type: 'success',
      message: isRTL ? 'تم تصدير المهام بنجاح' : 'Tasks exported successfully'
    });
  };

  const getStatusText = (status: DevTask['status']) => {
    const texts = {
      pending: isRTL ? 'قيد الانتظار' : 'Pending',
      in_progress: isRTL ? 'قيد التنفيذ' : 'In Progress',
      testing: isRTL ? 'في الاختبار' : 'Testing',
      completed: isRTL ? 'مكتملة' : 'Completed',
      blocked: isRTL ? 'متوقفة' : 'Blocked',
    };
    return texts[status];
  };

  const getStatusBadgeVariant = (status: DevTask['status']): 'light' | 'success' | 'error' | 'warning' | 'info' | 'primary' | 'secondary' => {
    const variants: Record<DevTask['status'], 'light' | 'success' | 'error' | 'warning' | 'info' | 'primary' | 'secondary'> = {
      pending: 'light',
      in_progress: 'info',
      testing: 'warning',
      completed: 'success',
      blocked: 'error',
    };
    return variants[status];
  };

  const getTestingStatusBadgeVariant = (status: DevTask['testingStatus']): 'light' | 'success' | 'error' | 'warning' | 'info' | 'primary' | 'secondary' => {
    const variants: Record<DevTask['testingStatus'], 'light' | 'success' | 'error' | 'warning' | 'info' | 'primary' | 'secondary'> = {
      not_tested: 'light',
      testing: 'warning',
      passed: 'success',
      failed: 'error',
    };
    return variants[status];
  };

  const getPriorityColor = (priority: number) => {
    if (priority <= 3) return 'border-t-error-500';
    if (priority <= 7) return 'border-t-warning-500';
    return 'border-t-success-500';
  };

  const getPriorityBadgeVariant = (priority: number): 'error' | 'warning' | 'success' => {
    if (priority <= 3) return 'error';
    if (priority <= 7) return 'warning';
    return 'success';
  };

  const getProgress = (task: DevTask) => {
    if (task.status === 'completed') return 100;
    if (task.status === 'blocked') return 25;
    if (!task.startDate) return 0;

    const start = new Date(task.startDate).getTime();
    const end = new Date(task.dueDate).getTime();
    const now = Date.now();

    const timeProgress = now < start ? 0 : now > end ? 100 : Math.round(((now - start) / (end - start)) * 100);

    let statusProgress = 0;
    switch (task.status) {
      case 'pending':
        statusProgress = 10;
        break;
      case 'in_progress':
        statusProgress = 40;
        break;
      case 'testing':
        statusProgress = 75;
        break;
      default:
        statusProgress = 0;
    }

    const combinedProgress = Math.round((statusProgress * 0.6) + (timeProgress * 0.4));
    return Math.min(combinedProgress, 95);
  };

  const statusOptions = [
    { value: 'pending', label: isRTL ? 'قيد الانتظار' : 'Pending', color: 'text-gray-600 dark:text-gray-400', icon: <Clock size={16} /> },
    { value: 'in_progress', label: isRTL ? 'قيد التنفيذ' : 'In Progress', color: 'text-blue-light-600 dark:text-blue-light-400', icon: <PlayCircle size={16} /> },
    { value: 'testing', label: isRTL ? 'في الاختبار' : 'Testing', color: 'text-warning-600 dark:text-warning-400', icon: <AlertCircle size={16} /> },
    { value: 'completed', label: isRTL ? 'مكتملة' : 'Completed', color: 'text-success-600 dark:text-success-400', icon: <CheckCircle2 size={16} /> },
    { value: 'blocked', label: isRTL ? 'متوقفة' : 'Blocked', color: 'text-error-600 dark:text-error-400', icon: <XCircle size={16} /> },
  ];

  const testingStatusOptions = [
    { value: 'not_tested', label: isRTL ? 'غير مختبر' : 'Not Tested', color: 'text-gray-600 dark:text-gray-400', icon: <HelpCircle size={16} /> },
    { value: 'testing', label: isRTL ? 'قيد الاختبار' : 'Testing', color: 'text-warning-600 dark:text-warning-400', icon: <Timer size={16} /> },
    { value: 'passed', label: isRTL ? 'نجح' : 'Passed', color: 'text-success-600 dark:text-success-400', icon: <CheckCircle size={16} /> },
    { value: 'failed', label: isRTL ? 'فشل' : 'Failed', color: 'text-error-600 dark:text-error-400', icon: <AlertTriangle size={16} /> },
  ];

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {isRTL ? 'مهام التطوير' : 'Development Tasks'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {isRTL ? 'إدارة ومتابعة مهام التطوير والاختبار' : 'Manage and track development and testing tasks'}
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title={isRTL ? 'قيد التنفيذ' : 'In Progress'}
          value={stats.inProgress.toString()}
          icon={<PlayCircle className="w-6 h-6" />}
          trend={stats.total > 0 ? { value: Math.round((stats.inProgress / stats.total) * 100), isPositive: true } : undefined}
          badgeColor="primary"
        />
        <StatCard
          title={isRTL ? 'في الاختبار' : 'Testing'}
          value={stats.testing.toString()}
          icon={<AlertCircle className="w-6 h-6" />}
          trend={stats.total > 0 ? { value: Math.round((stats.testing / stats.total) * 100), isPositive: true } : undefined}
          badgeColor="warning"
        />
        <StatCard
          title={isRTL ? 'جاهز للنشر' : 'Ready to Deploy'}
          value={stats.deploymentReady.toString()}
          icon={<CheckCircle2 className="w-6 h-6" />}
          trend={stats.total > 0 ? { value: Math.round((stats.deploymentReady / stats.total) * 100), isPositive: true } : undefined}
          badgeColor="success"
        />
        <StatCard
          title={isRTL ? 'اختبار ناجح' : 'Tests Passed'}
          value={stats.testsPassed.toString()}
          icon={<CheckCircle className="w-6 h-6" />}
          trend={stats.total > 0 ? { value: Math.round((stats.testsPassed / stats.total) * 100), isPositive: true } : undefined}
          badgeColor="info"
        />
      </div>

      {/* Controls */}
      <Card className="mb-6">
        <Card.Body className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Tabs */}
            <div className="flex gap-2">
              <Button
                onClick={() => setActiveTab('my')}
                variant={activeTab === 'my' ? 'primary' : 'outline'}
                size="sm"
              >
                {isRTL ? 'مهامي' : 'My Tasks'}
              </Button>
              <Button
                onClick={() => setActiveTab('all')}
                variant={activeTab === 'all' ? 'primary' : 'outline'}
                size="sm"
              >
                {isRTL ? 'جميع المهام' : 'All Tasks'}
              </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 flex-1">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                <option value="all">{isRTL ? 'جميع الحالات' : 'All Status'}</option>
                <option value="pending">{isRTL ? 'قيد الانتظار' : 'Pending'}</option>
                <option value="in_progress">{isRTL ? 'قيد التنفيذ' : 'In Progress'}</option>
                <option value="testing">{isRTL ? 'في الاختبار' : 'Testing'}</option>
                <option value="completed">{isRTL ? 'مكتملة' : 'Completed'}</option>
                <option value="blocked">{isRTL ? 'متوقفة' : 'Blocked'}</option>
              </select>

              <select
                value={testingFilter}
                onChange={(e) => setTestingFilter(e.target.value as any)}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                <option value="all">{isRTL ? 'جميع الاختبارات' : 'All Testing'}</option>
                <option value="not_tested">{isRTL ? 'غير مختبر' : 'Not Tested'}</option>
                <option value="testing">{isRTL ? 'قيد الاختبار' : 'Testing'}</option>
                <option value="passed">{isRTL ? 'نجح' : 'Passed'}</option>
                <option value="failed">{isRTL ? 'فشل' : 'Failed'}</option>
              </select>

              <select
                value={deploymentFilter}
                onChange={(e) => setDeploymentFilter(e.target.value as any)}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                <option value="all">{isRTL ? 'جميع المهام' : 'All Tasks'}</option>
                <option value="ready">{isRTL ? 'جاهز للنشر' : 'Ready to Deploy'}</option>
                <option value="not_ready">{isRTL ? 'غير جاهز' : 'Not Ready'}</option>
              </select>

              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={isRTL ? 'بحث...' : 'Search...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 rtl:pl-3 rtl:pr-10 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={exportToCSV}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <FileDown className="w-4 h-4" />
                <span className="hidden sm:inline">{isRTL ? 'تصدير' : 'Export'}</span>
              </Button>
              <Button
                onClick={generateWeeklyReport}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">{isRTL ? 'تقرير' : 'Report'}</span>
              </Button>
              {canWrite('dev_tasks') && (
                <Button
                  onClick={() => setShowModal(true)}
                  variant="primary"
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {isRTL ? 'إضافة مهمة' : 'Add Task'}
                </Button>
              )}
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Tasks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredTasks.length === 0 ? (
          <Card className="col-span-full">
            <Card.Body className="p-12 text-center">
              <ListFilter className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {isRTL ? 'لا توجد مهام' : 'No tasks found'}
              </p>
            </Card.Body>
          </Card>
        ) : (
          filteredTasks.map((task, index) => {
            const progress = getProgress(task);
            const assignee = employees.find(e => e.id === task.assignedTo);
            const isOverdue = task.status !== 'completed' && new Date(task.dueDate) < new Date();

            return (
              <Card
                key={task.id}
                className={`group border-t-4 ${getPriorityColor(task.priority)} hover:shadow-lg transition-all duration-300`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <Card.Body className="p-5">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant={getStatusBadgeVariant(task.status)} size="sm">
                        {getStatusText(task.status)}
                      </Badge>
                      {task.testingStatus !== 'not_tested' && (
                        <Badge variant={getTestingStatusBadgeVariant(task.testingStatus)} size="sm">
                          {task.testingStatus.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {isOverdue && (
                        <span className="flex h-2.5 w-2.5 relative" title={isRTL ? 'متأخر' : 'Overdue'}>
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-error-500"></span>
                        </span>
                      )}
                      <Badge variant={getPriorityBadgeVariant(task.priority)} size="sm">
                        {task.priority}
                      </Badge>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                    {task.title}
                  </h3>

                  <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-2 mb-4 h-10">
                    {task.description || (isRTL ? 'لا يوجد وصف' : 'No description provided')}
                  </p>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-medium text-gray-500 dark:text-gray-400">{isRTL ? 'التقدم' : 'Progress'}</span>
                      <span className="font-bold text-gray-700 dark:text-gray-300">{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          progress === 100 ? 'bg-success-500' : progress > 75 ? 'bg-warning-500' : 'bg-brand-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Meta Info */}
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-4">
                    <div className="flex items-center gap-2">
                      <Avatar
                        src={assignee?.avatar}
                        alt={assignee?.name || user?.name || 'User'}
                        size="sm"
                      />
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-400">{isRTL ? 'المسؤول' : 'Assignee'}</span>
                        <span className="font-medium truncate max-w-[100px]">
                          {assignee?.name || user?.name || 'Unknown'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1.5 text-gray-400" title={isRTL ? 'تاريخ التسجيل' : 'Created'}>
                        <FileText size={12} />
                        <span>{format(new Date(task.createdAt), 'dd/MM')}</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${task.status === 'completed' ? 'text-success-600 dark:text-success-400' : 'text-warning-600 dark:text-warning-400'}`}>
                        {task.status === 'completed' ? <CheckCircle2 size={12} /> : <Calendar size={12} />}
                        <span className="font-medium">
                          {task.status === 'completed' && task.completedDate
                            ? format(new Date(task.completedDate), 'dd/MM')
                            : format(new Date(task.dueDate), 'dd/MM')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  {task.tags && task.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {task.tags.slice(0, 3).map((tag, i) => (
                        <Badge key={i} variant="light" size="sm">
                          #{tag}
                        </Badge>
                      ))}
                      {task.tags.length > 3 && (
                        <Badge variant="light" size="sm">
                          +{task.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                    {canWrite('dev_tasks') && (
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <CustomDropdown
                          value={task.status}
                          onChange={(value) => handleStatusChange(task.id, value as DevTask['status'])}
                          options={statusOptions}
                          isRTL={isRTL}
                          className="w-full"
                        />
                        <CustomDropdown
                          value={task.testingStatus}
                          onChange={(value) => handleTestingStatusChange(task.id, value as DevTask['testingStatus'])}
                          options={testingStatusOptions}
                          isRTL={isRTL}
                          className="w-full"
                        />
                      </div>
                    )}

                    <div className="flex gap-1">
                      <button
                        onClick={() => setSelectedTask(task)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-brand-600 transition-colors"
                        title={isRTL ? 'التفاصيل' : 'Details'}
                      >
                        <Eye size={16} />
                      </button>
                      {canWrite('dev_tasks') && (
                        <button
                          onClick={() => handleEdit(task)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-brand-600 transition-colors"
                          title={isRTL ? 'تعديل' : 'Edit'}
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                      {canDelete('dev_tasks') && (
                        <button
                          onClick={() => setDeleteId(task.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-error-50 dark:hover:bg-error-900/20 text-gray-400 hover:text-error-600 transition-colors"
                          title={isRTL ? 'حذف' : 'Delete'}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </Card.Body>
              </Card>
            );
          })
        )}
      </div>

      {/* Modal for Add/Edit */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingTask ? (isRTL ? 'تعديل المهمة' : 'Edit Task') : (isRTL ? 'إضافة مهمة جديدة' : 'Add New Task')}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={isRTL ? 'العنوان *' : 'Title *'}
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />

          <Textarea
            label={isRTL ? 'الوصف' : 'Description'}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {isRTL ? 'الأولوية' : 'Priority'}
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {isRTL ? '1 (الأعلى) - 10 (الأقل)' : '1 (Highest) - 10 (Lowest)'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              type="date"
              label={isRTL ? 'تاريخ البداية' : 'Start Date'}
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
            <Input
              type="date"
              label={isRTL ? 'تاريخ النهاية' : 'Due Date'}
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isRTL ? 'الحالة' : 'Status'}
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                <option value="pending">{isRTL ? 'قيد الانتظار' : 'Pending'}</option>
                <option value="in_progress">{isRTL ? 'قيد التنفيذ' : 'In Progress'}</option>
                <option value="testing">{isRTL ? 'في الاختبار' : 'Testing'}</option>
                <option value="completed">{isRTL ? 'مكتملة' : 'Completed'}</option>
                <option value="blocked">{isRTL ? 'متوقفة' : 'Blocked'}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isRTL ? 'حالة الاختبار' : 'Testing Status'}
              </label>
              <select
                value={formData.testingStatus}
                onChange={(e) => setFormData({ ...formData, testingStatus: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                <option value="not_tested">{isRTL ? 'غير مختبر' : 'Not Tested'}</option>
                <option value="testing">{isRTL ? 'قيد الاختبار' : 'Testing'}</option>
                <option value="passed">{isRTL ? 'نجح' : 'Passed'}</option>
                <option value="failed">{isRTL ? 'فشل' : 'Failed'}</option>
              </select>
            </div>
          </div>

          <Textarea
            label={isRTL ? 'ملاحظات الاختبار' : 'Testing Notes'}
            value={formData.testingNotes}
            onChange={(e) => setFormData({ ...formData, testingNotes: e.target.value })}
            rows={2}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {isRTL ? 'العلامات' : 'Tags'}
            </label>
            <div className="flex gap-2 mb-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder={isRTL ? 'أضف علامة...' : 'Add tag...'}
                className="flex-1"
              />
              <Button
                type="button"
                onClick={handleAddTag}
                variant="primary"
                size="sm"
              >
                {isRTL ? 'إضافة' : 'Add'}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag, i) => (
                <Badge
                  key={i}
                  variant="light"
                  className="flex items-center gap-1"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="text-error-500 hover:text-error-700"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="deploymentReady"
              checked={formData.deploymentReady}
              onChange={(e) => setFormData({ ...formData, deploymentReady: e.target.checked })}
              className="rounded text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="deploymentReady" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {isRTL ? 'جاهز للنشر على الموقع' : 'Ready for deployment'}
            </label>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              onClick={handleCloseModal}
              variant="outline"
            >
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              variant="primary"
            >
              {editingTask ? (isRTL ? 'تحديث' : 'Update') : (isRTL ? 'إضافة' : 'Add')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Comments Modal */}
      <Modal
        isOpen={!!selectedTask}
        onClose={() => {
          setSelectedTask(null);
          setCommentText('');
        }}
        title={isRTL ? 'تفاصيل المهمة' : 'Task Details'}
      >
        {selectedTask && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-2">{selectedTask.title}</h3>
              <p className="text-gray-600 dark:text-gray-400">{selectedTask.description}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant={getStatusBadgeVariant(selectedTask.status)}>
                {getStatusText(selectedTask.status)}
              </Badge>
              <Badge variant={getTestingStatusBadgeVariant(selectedTask.testingStatus)}>
                {selectedTask.testingStatus.replace('_', ' ')}
              </Badge>
              {selectedTask.deploymentReady && (
                <Badge variant="success">
                  {isRTL ? 'جاهز للنشر' : 'Ready to Deploy'}
                </Badge>
              )}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                {isRTL ? 'التعليقات' : 'Comments'}
              </h4>

              <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
                {selectedTask.comments && selectedTask.comments.length > 0 ? (
                  selectedTask.comments.map((comment, index) => (
                    <Card key={index} className="bg-gray-50 dark:bg-gray-900">
                      <Card.Body className="p-3">
                        <p className="text-sm text-gray-700 dark:text-gray-300">{comment.content}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {format(new Date(comment.createdAt), 'dd/MM/yyyy HH:mm', { locale })}
                        </p>
                      </Card.Body>
                    </Card>
                  ))
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                    {isRTL ? 'لا توجد تعليقات' : 'No comments yet'}
                  </p>
                )}
              </div>

              {canWrite('dev_tasks') && (
                <div className="flex gap-2">
                  <Input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={isRTL ? 'اكتب تعليقاً...' : 'Write a comment...'}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleAddComment}
                    disabled={!commentText.trim()}
                    variant="primary"
                    size="sm"
                  >
                    {isRTL ? 'إرسال' : 'Send'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={isRTL ? 'تأكيد الحذف' : 'Confirm Delete'}
        message={isRTL ? 'هل أنت متأكد من حذف هذه المهمة؟' : 'Are you sure you want to delete this task?'}
        type="danger"
      />

      {/* Toast */}
      <Toast
        message={toast.message}
        type={toast.type}
        isOpen={toast.show}
        onClose={() => setToast({ ...toast, show: false })}
      />
    </div>
  );
};

export default DevTasks;
