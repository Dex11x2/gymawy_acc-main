import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { useDataStore } from '../store/dataStore';
import { usePermissions } from '../hooks/usePermissions';
import { Task } from '../types';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { Card, StatCard, Badge, Button, Input, Textarea, Checkbox, Table } from '../components/ui';
import {
  ClipboardList, Clock, RefreshCw, CheckCircle, Plus, Send,
  Bell, MessageSquare, Edit2, Trash2, Calendar,
  User, Users, FileText
} from 'lucide-react';

const Tasks: React.FC = () => {
  const { user } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const { employees, departments, tasks, loadEmployees, loadDepartments, loadTasks, addTask, updateTask, deleteTask, addTaskComment } = useDataStore();
  const { canWrite } = usePermissions();

  const canCreateTask = canWrite('tasks');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskDetails, setShowTaskDetails] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'my' | 'sent'>('my');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isPlanningTask, setIsPlanningTask] = useState(false);

  useEffect(() => {
    if (user) {
      loadEmployees();
      loadDepartments();
      loadTasks();
    }
  }, [user, loadEmployees, loadDepartments, loadTasks]);

  // Socket.IO listener for real-time comments and notifications
  useEffect(() => {
    if (!user) return;

    const socket = (window as any).socket;
    if (!socket) return;

    const handleNewComment = (data: { taskId: string; comment: any }) => {
      loadTasks();

      if (selectedTask && selectedTask.id === data.taskId) {
        setSelectedTask({
          ...selectedTask,
          comments: [...selectedTask.comments, data.comment]
        });
      }

      setToast({message: `تعليق جديد من ${data.comment.authorName}`, type: 'info', isOpen: true});
    };

    const handleNotification = (notification: any) => {
      const audio = new Audio('/notification.mp3');
      audio.play().catch(() => {});

      addNotification({
        userId: user.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        link: notification.link
      });
    };

    socket.on('new-task-comment', handleNewComment);
    socket.on('notification', handleNotification);

    return () => {
      socket.off('new-task-comment', handleNewComment);
      socket.off('notification', handleNotification);
    };
  }, [user, selectedTask, loadTasks, addNotification]);

  const [toast, setToast] = useState<{message: string; type: 'success' | 'error' | 'info' | 'warning'; isOpen: boolean}>({message: '', type: 'success', isOpen: false});
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: [] as string[],
    assignedDepartment: '',
    assignmentType: 'employees' as 'employees' | 'department',
    priority: 'medium' as 'low' | 'medium' | 'high',
    dueDate: new Date().toISOString().split('T')[0],
    reminderTime: '09:00'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.assignmentType === 'employees' && formData.assignedTo.length === 0) {
      setToast({message: 'يجب اختيار موظف واحد على الأقل', type: 'error', isOpen: true});
      return;
    }
    if (formData.assignmentType === 'department' && !formData.assignedDepartment) {
      setToast({message: 'يجب اختيار قسم', type: 'error', isOpen: true});
      return;
    }

    try {
      const currentEmployee = (employees || []).find((e: any) => String(e.userId?._id || e.userId?.id || e.userId) === String(user?.id));
      const assignedByEmployeeId = currentEmployee?.id || user?.id || '';

      if (editingTask) {
        await updateTask(editingTask.id, {
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          dueDate: new Date(formData.dueDate),
        });
        setToast({message: 'تم تحديث المهمة بنجاح', type: 'success', isOpen: true});
        setEditingTask(null);
      } else {
        const assignedEmployees = formData.assignmentType === 'employees'
          ? formData.assignedTo
          : (employees || []).filter((emp: any) => emp.departmentId === formData.assignedDepartment).map((emp: any) => emp.id);

        for (const empId of assignedEmployees) {
          const taskData = {
            title: formData.title,
            description: formData.description,
            assignedTo: empId,
            assignedBy: assignedByEmployeeId,
            priority: formData.priority,
            dueDate: new Date(formData.dueDate),
            status: 'pending' as const,
            comments: []
          };

          await addTask(taskData);

          addNotification({
            userId: empId,
            type: 'task',
            title: 'مهمة جديدة',
            message: `تم تعيين مهمة جديدة لك: ${formData.title}`,
            link: '/tasks'
          });
        }
        setToast({message: 'تم إضافة المهمة بنجاح', type: 'success', isOpen: true});
      }

      setShowModal(false);
      setFormData({
        title: '',
        description: '',
        assignedTo: [],
        assignedDepartment: '',
        assignmentType: 'employees',
        priority: 'medium',
        dueDate: new Date().toISOString().split('T')[0],
        reminderTime: '09:00'
      });
    } catch (error: any) {
      console.error('Task error:', error);
      setToast({message: error?.response?.data?.message || 'حدث خطأ', type: 'error', isOpen: true});
    }
  };

  const updateTaskStatus = async (taskId: string, status: 'pending' | 'in_progress' | 'completed') => {
    try {
      await updateTask(taskId, { status });

      const statusText = status === 'completed' ? 'مكتملة' : status === 'in_progress' ? 'قيد التنفيذ' : 'معلقة';
      setToast({message: `تم تحديث حالة المهمة إلى: ${statusText}`, type: 'success', isOpen: true});

      const task = tasks.find(t => t.id === taskId);
      if (task) {
        const assignedByData = task.assignedBy as any;
        const assignedById = typeof assignedByData === 'object' ? (assignedByData?._id || assignedByData?.id) : task.assignedBy;

        addNotification({
          userId: assignedById,
          type: 'task',
          title: 'تحديث حالة المهمة',
          message: `قام ${user?.name} بتحديث حالة المهمة "${task.title}" إلى: ${statusText}`,
          link: '/tasks'
        });
      }
    } catch (error: any) {
      console.error('Task update error:', error);
      setToast({message: 'حدث خطأ أثناء تحديث المهمة', type: 'error', isOpen: true});
    }
  };

  const addComment = async (taskId: string, content: string) => {
    if (!content.trim()) return;

    const tempCommentId = Date.now().toString();
    const newCommentObj = {
      id: tempCommentId,
      authorId: user?.id || '',
      authorName: user?.name || 'User',
      content,
      createdAt: new Date()
    };

    try {
      if (selectedTask) {
        setSelectedTask({
          ...selectedTask,
          comments: [...selectedTask.comments, newCommentObj]
        });
      }

      setNewComment('');

      await addTaskComment(taskId, content);
      setToast({message: 'تم إضافة التعليق بنجاح', type: 'success', isOpen: true});

      const task = tasks.find(t => t.id === taskId);
      if (task) {
        const assignedByData = task.assignedBy as any;
        const assignedById = typeof assignedByData === 'object' ? (assignedByData?._id || assignedByData?.id) : task.assignedBy;
        const assignedToData = task.assignedTo as any;
        const assignedToId = typeof assignedToData === 'object' ? (assignedToData?._id || assignedToData?.id) : task.assignedTo;

        const currentEmployeeId = (employees || []).find((e: any) => String(e.userId?._id || e.userId?.id || e.userId) === String(user?.id))?.id;

        if (String(currentEmployeeId) === String(assignedById)) {
          addNotification({
            userId: assignedToId,
            type: 'task',
            title: 'تعليق جديد',
            message: `${user?.name} علّق على مهمتك "${task.title}"`,
            link: '/tasks'
          });
        } else {
          addNotification({
            userId: assignedById,
            type: 'task',
            title: 'تعليق جديد',
            message: `${user?.name} علّق على المهمة "${task.title}"`,
            link: '/tasks'
          });
        }
      }

      loadTasks();
    } catch (error: any) {
      console.error('Comment error:', error);
      setToast({message: 'حدث خطأ أثناء إضافة التعليق', type: 'error', isOpen: true});

      if (selectedTask) {
        setSelectedTask({
          ...selectedTask,
          comments: selectedTask.comments.filter(c => c.id !== tempCommentId)
        });
      }
    }
  };

  const openTaskDetails = (task: Task) => {
    setSelectedTask(task);
    setShowTaskDetails(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    const assignedToData = task.assignedTo as any;
    const assignedToId = typeof assignedToData === 'object' ? (assignedToData?._id || assignedToData?.id) : task.assignedTo;
    const isMyTask = String(assignedToId) === String(currentEmployee?.id);
    setIsPlanningTask(isMyTask);
    setFormData({
      title: task.title,
      description: task.description,
      assignedTo: [typeof task.assignedTo === 'string' ? task.assignedTo : (task.assignedTo as any)?._id || (task.assignedTo as any)?.id],
      assignedDepartment: '',
      assignmentType: 'employees',
      priority: task.priority,
      dueDate: new Date(task.dueDate).toISOString().split('T')[0],
      reminderTime: '09:00'
    });
    setShowModal(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه المهمة؟')) return;

    try {
      await deleteTask(taskId);
      setToast({message: 'تم حذف المهمة بنجاح', type: 'success', isOpen: true});
    } catch (error: any) {
      setToast({message: 'حدث خطأ أثناء حذف المهمة', type: 'error', isOpen: true});
    }
  };

  const setReminder = (task: Task) => {
    const currentEmployee = (employees || []).find((e: any) => String(e.userId?._id || e.userId?.id || e.userId) === String(user?.id));
    const assignedToData = task.assignedTo as any;
    const isMyTask = String(task.assignedTo) === String(currentEmployee?.id) ||
                     (typeof assignedToData === 'object' && String(assignedToData?._id || assignedToData?.id) === String(currentEmployee?.id));

    if (isMyTask) {
      const audio = new Audio('/notification.mp3');
      audio.play().catch(() => {});

      setToast({message: `تم تفعيل التنبيه للمهمة "${task.title}"`, type: 'success', isOpen: true});

      const reminders = JSON.parse(localStorage.getItem('taskReminders') || '[]');
      reminders.push({
        taskId: task.id,
        taskTitle: task.title,
        dueDate: task.dueDate,
        createdAt: new Date().toISOString()
      });
      localStorage.setItem('taskReminders', JSON.stringify(reminders));
    } else {
      const dueDate = new Date(task.dueDate);
      const now = new Date();
      const diffTime = dueDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        setToast({message: 'المهمة متأخرة!', type: 'warning', isOpen: true});
      } else if (diffDays === 1) {
        setToast({message: `تنبيه: المهمة "${task.title}" غداً!`, type: 'info', isOpen: true});
      } else {
        setToast({message: `تنبيه: المهمة "${task.title}" بعد ${diffDays} أيام`, type: 'info', isOpen: true});
      }
    }
  };

  // Filter tasks
  const currentEmployee = (employees || []).find((e: any) => String(e.userId?._id || e.userId?.id || e.userId) === String(user?.id));

  const myTasksList = tasks.filter(task => {
    const assignedToData = task.assignedTo as any;
    return String(task.assignedTo) === String(currentEmployee?.id) ||
           (typeof assignedToData === 'object' && String(assignedToData?._id || assignedToData?.id) === String(currentEmployee?.id));
  });

  const sentTasks = tasks.filter(task => {
    const assignedByData = task.assignedBy as any;
    return String(task.assignedBy) === String(currentEmployee?.id) ||
           (typeof assignedByData === 'object' && String(assignedByData?._id || assignedByData?.id) === String(currentEmployee?.id));
  });

  const filteredTasks = (activeTab === 'my' ? myTasksList : sentTasks).filter(task =>
    statusFilter === 'all' ? true : task.status === statusFilter
  );
  const myTasks = filteredTasks;

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return <Badge variant="error">عالية</Badge>;
      case 'medium': return <Badge variant="warning">متوسطة</Badge>;
      case 'low': return <Badge variant="success">منخفضة</Badge>;
      default: return <Badge variant="light">غير محددة</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge variant="success">مكتملة</Badge>;
      case 'in_progress': return <Badge variant="info">قيد التنفيذ</Badge>;
      case 'pending': return <Badge variant="light">معلقة</Badge>;
      default: return <Badge variant="light">غير محددة</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-800 dark:text-white">المهام</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">إدارة المهام والأنشطة</p>
        </div>
        {canCreateTask && (
          <div className="flex gap-3">
            <Button
              onClick={() => {
                setIsPlanningTask(true);
                setEditingTask(null);
                setFormData({
                  title: '',
                  description: '',
                  assignedTo: [currentEmployee?.id || user?.id || ''],
                  assignedDepartment: '',
                  assignmentType: 'employees',
                  priority: 'medium',
                  dueDate: new Date().toISOString().split('T')[0],
                  reminderTime: '09:00'
                });
                setShowModal(true);
              }}
              className="bg-blue-light-500 hover:bg-blue-light-600"
            >
              <FileText className="h-4 w-4" />
              تسكة تخطيطية جديدة
            </Button>
            <Button
              onClick={() => {
                setIsPlanningTask(false);
                setEditingTask(null);
                setFormData({
                  title: '',
                  description: '',
                  assignedTo: [],
                  assignedDepartment: '',
                  assignmentType: 'employees',
                  priority: 'medium',
                  dueDate: new Date().toISOString().split('T')[0],
                  reminderTime: '09:00'
                });
                setShowModal(true);
              }}
            >
              <Plus className="h-4 w-4" />
              إضافة مهمة جديدة
            </Button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        <StatCard
          title="المهام المعلقة"
          value={myTasks.filter(t => t.status === 'pending').length.toString()}
          icon={<Clock className="h-6 w-6" />}
          iconColor="warning"
        />
        <StatCard
          title="قيد التنفيذ"
          value={myTasks.filter(t => t.status === 'in_progress').length.toString()}
          icon={<RefreshCw className="h-6 w-6" />}
          iconColor="info"
        />
        <StatCard
          title="المكتملة"
          value={myTasks.filter(t => t.status === 'completed').length.toString()}
          icon={<CheckCircle className="h-6 w-6" />}
          iconColor="success"
        />
      </div>

      {/* Tasks Table Card */}
      <Card>
        <Card.Header>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-brand-500" />
              قائمة المهام
            </h2>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setActiveTab('my')}
                variant={activeTab === 'my' ? 'primary' : 'outline'}
                size="sm"
              >
                <FileText className="h-4 w-4" />
                تسكات تخطيطية ({myTasksList.length})
              </Button>
              <Button
                onClick={() => setActiveTab('sent')}
                variant={activeTab === 'sent' ? 'primary' : 'outline'}
                size="sm"
                className={activeTab === 'sent' ? 'bg-success-500 hover:bg-success-600' : ''}
              >
                <Send className="h-4 w-4" />
                التي أرسلتها ({sentTasks.length})
              </Button>
            </div>
          </div>
        </Card.Header>

        {/* Status Filter */}
        <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'الكل', count: (activeTab === 'my' ? myTasksList : sentTasks).length },
              { key: 'pending', label: 'معلقة', count: (activeTab === 'my' ? myTasksList : sentTasks).filter(t => t.status === 'pending').length, icon: <Clock className="h-3 w-3" /> },
              { key: 'in_progress', label: 'قيد التنفيذ', count: (activeTab === 'my' ? myTasksList : sentTasks).filter(t => t.status === 'in_progress').length, icon: <RefreshCw className="h-3 w-3" /> },
              { key: 'completed', label: 'مكتملة', count: (activeTab === 'my' ? myTasksList : sentTasks).filter(t => t.status === 'completed').length, icon: <CheckCircle className="h-3 w-3" /> },
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => setStatusFilter(filter.key as any)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                  ${statusFilter === filter.key
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                    : 'bg-brand-50 text-gray-600 hover:bg-brand-100 border border-brand-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700'
                  }
                `}
              >
                {filter.icon}
                {filter.label} ({filter.count})
              </button>
            ))}
          </div>
        </div>

        <Card.Body className="p-0">
          {myTasks.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <ClipboardList className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">
                {activeTab === 'my' ? 'لا توجد مهام مُعيّنة لك' : 'لم ترسل أي مهام بعد'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {activeTab === 'my' ? 'ستظهر هنا المهام المُعيّنة لك' : 'ستظهر هنا المهام التي أرسلتها للآخرين'}
              </p>
            </div>
          ) : (
            <Table>
              <Table.Header>
                <Table.Row hover={false}>
                  <Table.Head>العنوان</Table.Head>
                  <Table.Head>{activeTab === 'my' ? 'مُعيّن من' : 'مُعيّن لـ'}</Table.Head>
                  <Table.Head>الأولوية</Table.Head>
                  <Table.Head>الحالة</Table.Head>
                  <Table.Head>تاريخ الاستحقاق</Table.Head>
                  <Table.Head align="center">الإجراءات</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {myTasks.map((task) => {
                  const assignedByData = task.assignedBy as any;
                  const assignedToData = task.assignedTo as any;

                  const assignedByName = typeof assignedByData === 'object' && assignedByData?.name
                    ? assignedByData.name
                    : (employees || []).find((e: any) => String(e.id) === String(task.assignedBy))?.name || 'مدير';

                  const assignedToName = typeof assignedToData === 'object' && assignedToData?.name
                    ? assignedToData.name
                    : (employees || []).find((e: any) => String(e.id) === String(task.assignedTo))?.name || 'موظف';

                  const displayName = activeTab === 'my' ? assignedByName : assignedToName;

                  return (
                    <Table.Row key={task.id} className="group hover:bg-brand-50/50 dark:hover:bg-brand-500/5 transition-colors">
                      <Table.Cell className="font-medium text-gray-900 dark:text-gray-100">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-8 rounded-full ${
                            task.priority === 'high' ? 'bg-error-500' : 
                            task.priority === 'medium' ? 'bg-warning-500' : 'bg-success-500'
                          }`}></div>
                          {task.title}
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-brand-100 dark:bg-brand-500/20 rounded-full flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold text-sm">
                            {displayName?.charAt(0) || <User className="h-4 w-4" />}
                          </div>
                          <span>{displayName}</span>
                        </div>
                      </Table.Cell>
                      <Table.Cell>{getPriorityBadge(task.priority)}</Table.Cell>
                      <Table.Cell>
                        {activeTab === 'my' ? (
                          <select
                            value={task.status}
                            onChange={(e) => updateTaskStatus(task.id, e.target.value as any)}
                            className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-brand-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                          >
                            <option value="pending">معلقة</option>
                            <option value="in_progress">قيد التنفيذ</option>
                            <option value="completed">مكتملة</option>
                          </select>
                        ) : (
                          getStatusBadge(task.status)
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                          <Calendar className="h-4 w-4" />
                          {new Date(task.dueDate).toLocaleDateString('ar-EG')}
                        </div>
                      </Table.Cell>
                      <Table.Cell align="center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setReminder(task)}
                            className="p-2 rounded-lg text-warning-600 bg-warning-50 hover:bg-warning-100 dark:bg-warning-500/10 dark:hover:bg-warning-500/20 transition-colors"
                            title="تنبيه"
                          >
                            <Bell className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openTaskDetails(task)}
                            className="p-2 rounded-lg text-brand-600 bg-brand-50 hover:bg-brand-100 dark:bg-brand-500/10 dark:hover:bg-brand-500/20 transition-colors"
                            title="التفاصيل والتعليقات"
                          >
                            <MessageSquare className="h-4 w-4" />
                            {task.comments.length > 0 && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-500 text-white text-xs rounded-full flex items-center justify-center">
                                {task.comments.length}
                              </span>
                            )}
                          </button>
                          <button
                            onClick={() => handleEditTask(task)}
                            className="p-2 rounded-lg text-success-600 bg-success-50 hover:bg-success-100 dark:bg-success-500/10 dark:hover:bg-success-500/20 transition-colors"
                            title="تعديل"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-2 rounded-lg text-error-600 bg-error-50 hover:bg-error-100 dark:bg-error-500/10 dark:hover:bg-error-500/20 transition-colors"
                            title="حذف"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Create/Edit Task Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setIsPlanningTask(false);
          setEditingTask(null);
        }}
        title={
          editingTask
            ? "تعديل المهمة"
            : isPlanningTask
            ? "إنشاء تسكة تخطيطية جديدة"
            : "إنشاء مهمة جديدة"
        }
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header Section */}
          <Card className="bg-gray-50 dark:bg-gray-800/50">
            <Card.Body>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="عنوان المهمة"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="اكتب عنوان المهمة هنا..."
                  required
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    مستوى الأولوية
                  </label>
                  <div className="flex gap-2">
                    {[
                      { value: 'low', label: 'منخفضة', color: 'success' },
                      { value: 'medium', label: 'متوسطة', color: 'warning' },
                      { value: 'high', label: 'عالية', color: 'error' }
                    ].map(priority => (
                      <button
                        key={priority.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, priority: priority.value as any })}
                        className={`
                          flex-1 py-2.5 px-3 rounded-lg border-2 text-sm font-medium transition-all
                          ${formData.priority === priority.value
                            ? priority.color === 'success'
                              ? 'bg-success-100 text-success-700 border-success-300 dark:bg-success-500/20 dark:text-success-400 dark:border-success-500/50'
                              : priority.color === 'warning'
                              ? 'bg-warning-100 text-warning-700 border-warning-300 dark:bg-warning-500/20 dark:text-warning-400 dark:border-warning-500/50'
                              : 'bg-error-100 text-error-700 border-error-300 dark:bg-error-500/20 dark:text-error-400 dark:border-error-500/50'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600'
                          }
                        `}
                      >
                        {priority.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>

          {/* Description */}
          <Textarea
            label="وصف المهمة"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            placeholder="اشرح تفاصيل المهمة والمطلوب إنجازه..."
            required
          />

          {/* Assignment Section */}
          {!isPlanningTask && (
            <Card className="bg-gray-50 dark:bg-gray-800/50">
              <Card.Body>
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-5 w-5 text-brand-500" />
                  <h3 className="font-semibold text-gray-800 dark:text-white">تعيين المهمة</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto bg-white dark:bg-gray-700 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
                  {(employees || []).map((employee: any) => {
                    const dept = (departments || []).find((d: any) => d.id === employee.departmentId);
                    return (
                      <Checkbox
                        key={employee.id}
                        checked={formData.assignedTo.includes(employee.id)}
                        onChange={(checked) => {
                          if (checked) {
                            setFormData({ ...formData, assignedTo: [...formData.assignedTo, employee.id] });
                          } else {
                            setFormData({ ...formData, assignedTo: formData.assignedTo.filter(id => id !== employee.id) });
                          }
                        }}
                        label={
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-brand-100 dark:bg-brand-500/20 rounded-full flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold text-sm">
                              {employee.name?.charAt(0)}
                            </div>
                            <div>
                              <span className="text-sm font-medium block">{employee.name}</span>
                              {dept && <span className="text-xs text-gray-500 dark:text-gray-400">{dept.name}</span>}
                            </div>
                          </div>
                        }
                      />
                    );
                  })}
                </div>
                {formData.assignedTo.length > 0 && (
                  <div className="mt-3">
                    <Badge variant="primary">تم اختيار {formData.assignedTo.length} موظف</Badge>
                  </div>
                )}
              </Card.Body>
            </Card>
          )}

          {/* Planning Task Info */}
          {isPlanningTask && (
            <Card className="bg-blue-light-50 dark:bg-blue-light-500/10 border-2 border-blue-light-200 dark:border-blue-light-500/30">
              <Card.Body>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-blue-light-100 dark:bg-blue-light-500/20 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-blue-light-600 dark:text-blue-light-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-blue-light-800 dark:text-blue-light-300">تسكة تخطيطية</h3>
                    <p className="text-sm text-blue-light-600 dark:text-blue-light-400">هذه مهمة تذكيرية شخصية لك فقط</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg space-y-2">
                  <p className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success-500" />
                    سيتم تعيين هذه المهمة لك تلقائياً كتذكير شخصي
                  </p>
                  <p className="text-sm text-blue-light-700 dark:text-blue-light-400 font-medium flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    سيتم تذكيرك في الوقت المحدد
                  </p>
                </div>
              </Card.Body>
            </Card>
          )}

          {/* Due Date & Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              type="date"
              label="تاريخ الاستحقاق"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              required
            />
            {isPlanningTask && (
              <Input
                type="time"
                label="وقت التذكير"
                value={formData.reminderTime}
                onChange={(e) => setFormData({ ...formData, reminderTime: e.target.value })}
                required
              />
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <Button
              type="submit"
              className={`flex-1 ${isPlanningTask ? 'bg-blue-light-500 hover:bg-blue-light-600' : ''}`}
            >
              {editingTask ? (
                <>
                  <Edit2 className="h-4 w-4" />
                  تحديث المهمة
                </>
              ) : isPlanningTask ? (
                <>
                  <FileText className="h-4 w-4" />
                  إنشاء تسكة تخطيطية
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  إنشاء المهمة
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowModal(false);
                setIsPlanningTask(false);
                setEditingTask(null);
              }}
              className="flex-1"
            >
              إلغاء
            </Button>
          </div>
        </form>
      </Modal>

      {/* Task Details Modal */}
      <Modal
        isOpen={showTaskDetails}
        onClose={() => setShowTaskDetails(false)}
        title={selectedTask?.title || 'تفاصيل المهمة'}
        size="xl"
      >
        {selectedTask && (() => {
          const currentEmployee = (employees || []).find((e: any) => String(e.userId?._id || e.userId?.id || e.userId) === String(user?.id));
          const assignedToData = selectedTask.assignedTo as any;
          const isMyTask = String(selectedTask.assignedTo) === String(currentEmployee?.id) ||
                           (typeof assignedToData === 'object' && String(assignedToData?._id || assignedToData?.id) === String(currentEmployee?.id));

          return (
            <div className="space-y-6">
              {/* Task Info */}
              <Card className="bg-gray-50 dark:bg-gray-800/50">
                <Card.Body>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">الحالة:</span>
                      {getStatusBadge(selectedTask.status)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">الأولوية:</span>
                      {getPriorityBadge(selectedTask.priority)}
                    </div>
                  </div>
                  <div className="mb-4">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">الوصف:</span>
                    <p className="mt-1 text-gray-800 dark:text-white/90">{selectedTask.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">تاريخ الاستحقاق:</span>
                    <span className="text-gray-800 dark:text-white/90">{new Date(selectedTask.dueDate).toLocaleDateString('ar-EG')}</span>
                  </div>
                </Card.Body>
              </Card>

              {/* Status Update */}
              {isMyTask && (
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">تحديث الحالة:</span>
                  <select
                    value={selectedTask.status}
                    onChange={(e) => {
                      updateTaskStatus(selectedTask.id, e.target.value as any);
                      setSelectedTask({...selectedTask, status: e.target.value as any});
                    }}
                    className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  >
                    <option value="pending">معلقة</option>
                    <option value="in_progress">قيد التنفيذ</option>
                    <option value="completed">مكتملة</option>
                  </select>
                </div>
              )}

              {/* Comments Section */}
              <Card>
                <Card.Header>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-brand-500" />
                    <h3 className="font-semibold text-gray-800 dark:text-white">
                      التعليقات ({selectedTask.comments.length})
                    </h3>
                  </div>
                </Card.Header>
                <Card.Body>
                  {/* Comments List */}
                  <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                    {selectedTask.comments.length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-4">لا توجد تعليقات بعد</p>
                    ) : (
                      selectedTask.comments.map((comment) => (
                        <div key={comment.id} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-xl">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-brand-100 dark:bg-brand-500/20 rounded-full flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold text-sm">
                                {comment.authorName.charAt(0)}
                              </div>
                              <span className="font-medium text-gray-800 dark:text-white/90">{comment.authorName}</span>
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(comment.createdAt).toLocaleString('ar-EG')}
                            </span>
                          </div>
                          <p className="text-gray-700 dark:text-gray-300">{comment.content}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Comment */}
                  <div className="flex gap-2">
                    <Input
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addComment(selectedTask.id, newComment)}
                      placeholder="اكتب تعليقاً..."
                      className="flex-1"
                    />
                    <Button onClick={() => addComment(selectedTask.id, newComment)}>
                      <Send className="h-4 w-4" />
                      إرسال
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </div>
          );
        })()}
      </Modal>

      <Toast
        message={toast.message}
        type={toast.type}
        isOpen={toast.isOpen}
        onClose={() => setToast({...toast, isOpen: false})}
      />
    </div>
  );
};

export default Tasks;
