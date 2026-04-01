import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useDataStore } from '../store/dataStore';
import { usePermissions } from '../hooks/usePermissions';
import api from '../services/api';
import Toast from '../components/Toast';
import Modal from '../components/Modal';
import { Card, StatCard, Badge, Button, Table, Avatar } from '../components/ui';
import {
  BarChart3,
  Plus,
  Edit2,
  Trash2,
  Lock,
  MapPin,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Palmtree,
  Timer,
  FileText,
  Smartphone,
  Camera,
  Wifi,
  Image,
  Shield,
  ArrowLeft,
  TrendingDown
} from 'lucide-react';

// دالة مساعدة لتحويل التوقيت UTC إلى توقيت مصر
const toEgyptTime = (utcDate: Date | string): Date => {
  const date = new Date(utcDate);
  // إضافة ساعتين لتحويل من UTC إلى توقيت مصر
  return new Date(date.getTime() + 2 * 60 * 60 * 1000);
};

// دالة للحصول على الوقت بتنسيق HH:mm بتوقيت مصر
const getEgyptTimeString = (utcDate: Date | string): string => {
  const egyptDate = toEgyptTime(utcDate);
  const hours = egyptDate.getUTCHours().toString().padStart(2, '0');
  const minutes = egyptDate.getUTCMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

const AttendanceManagement: React.FC = () => {
  const { user } = useAuthStore();
  const { employees, loadEmployees } = useDataStore();
  const { canRead, canWrite, canDelete } = usePermissions();

  // Check if user is a manager (can add permissions)
  const isManager = ['super_admin', 'general_manager', 'administrative_manager'].includes(user?.role || '');

  const canViewAttendance = canRead('attendance') || canRead('attendance_management');
  const canWriteAttendance = canWrite('attendance') || canWrite('attendance_management');
  const canDeleteAttendance = canDelete('attendance') || canDelete('attendance_management');
  const [records, setRecords] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | ''>(new Date().getDate()); // اليوم الحالي
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [toast, setToast] = useState({ message: '', type: 'success' as any, isOpen: false });
  const [showSelfieModal, setShowSelfieModal] = useState(false);
  const [selectedSelfie, setSelectedSelfie] = useState<{ photo: string; timestamp: Date; deviceInfo?: string } | null>(null);

  // حساب عدد أيام الشهر المحدد
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

  // Logging تشخيصي للصلاحيات
  useEffect(() => {
    console.log('🔐 صلاحيات إدارة الحضور:', {
      المستخدم: { id: user?.id, name: user?.name, role: user?.role },
      يمكن_القراءة_attendance: canRead('attendance'),
      يمكن_القراءة_attendance_management: canRead('attendance_management'),
      هل_مدير: isManager,
      صلاحيات_الحضور: user?.permissions?.filter(p =>
        p.module.includes('attendance')
      )
    });
  }, [user]);

  useEffect(() => {
    if (canViewAttendance) {
      loadRecords();
      loadEmployees();
    }
  }, [selectedMonth, selectedYear, selectedDay, selectedEmployee, canViewAttendance]);

  const loadRecords = async () => {
    try {
      const params: any = { month: selectedMonth, year: selectedYear };
      if (selectedEmployee) params.userId = selectedEmployee;

      console.log('📡 تحميل سجلات الحضور:', params);

      const response = await api.get('/attendance-records/monthly-report', { params });

      console.log('✅ تم استلام:', {
        عدد_السجلات: response.data.data.records.length,
        الملخص: response.data.data.summary
      });

      let filteredRecords = response.data.data.records;

      // فلترة حسب اليوم إذا تم اختياره (باستخدام توقيت مصر)
      if (selectedDay !== '') {
        filteredRecords = filteredRecords.filter((record: any) => {
          // تحويل تاريخ السجل إلى توقيت مصر للمقارنة الصحيحة
          const recordDateEgypt = toEgyptTime(record.date);
          return recordDateEgypt.getUTCDate() === selectedDay;
        });
      }

      const sortedRecords = filteredRecords.sort((a: any, b: any) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      console.log(`📋 عرض ${sortedRecords.length} سجل`);
      setRecords(sortedRecords);
    } catch (error: any) {
      console.error('❌ فشل تحميل سجلات الحضور:', error);

      // عرض رسالة الخطأ للمستخدم
      const errorMessage = error.response?.data?.message ||
                          error.response?.statusText ||
                          'فشل في تحميل سجلات الحضور';

      setToast({
        message: errorMessage,
        type: 'error',
        isOpen: true
      });

      setRecords([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    try {
      const earlyLeaveMinutes = parseInt(formData.get('earlyLeaveMinutes') as string) || 0;
      const delay = parseInt(formData.get('delay') as string) || 0;

      const data = {
        userId: formData.get('userId'),
        date: formData.get('date'),
        checkIn: formData.get('checkIn') || undefined,
        checkOut: formData.get('checkOut') || undefined,
        status: formData.get('status'),
        leaveType: formData.get('leaveType') || undefined,
        delay: delay,
        overtime: parseFloat(formData.get('overtime') as string) || 0,
        // Permission fields (only if user is manager)
        ...(isManager && {
          earlyLeaveMinutes: earlyLeaveMinutes,
          earlyLeaveReason: formData.get('earlyLeaveReason') || undefined,
          lateArrivalReason: formData.get('lateArrivalReason') || undefined,
          permissionNotes: formData.get('permissionNotes') || undefined,
          // Determine permission type based on what was filled
          permissionType: (() => {
            const hasEarly = earlyLeaveMinutes > 0;
            const hasLate = delay > 0 && formData.get('lateArrivalReason');
            if (hasEarly && hasLate) return 'both';
            if (hasEarly) return 'early_leave';
            if (hasLate) return 'late_arrival';
            return 'none';
          })()
        }),
        // Deduction fields (only if manager and deduction type is selected)
        ...(isManager && formData.get('deductionType') && {
          deduction: {
            type: formData.get('deductionType'),
            amount: parseFloat(formData.get('deductionAmount') as string) || 0,
            reason: formData.get('deductionReason') || undefined
          }
        })
      };

      if (editingRecord) {
        const recordId = editingRecord._id || editingRecord.id;
        if (!recordId) {
          setToast({ message: 'معرف السجل غير صحيح', type: 'error', isOpen: true });
          return;
        }
        console.log('Updating record:', recordId, data);
        await api.put(`/attendance-records/${recordId}`, data);
      } else {
        await api.post('/attendance-records/manual', data);
      }

      setToast({ message: editingRecord ? 'تم التحديث بنجاح' : 'تم الإضافة بنجاح', type: 'success', isOpen: true });
      setShowModal(false);
      setEditingRecord(null);
      loadRecords();
    } catch (error: any) {
      console.error('Submit error:', error.response?.data);
      setToast({ message: error.response?.data?.message || 'فشل الحفظ', type: 'error', isOpen: true });
    }
  };

  const handleEdit = (record: any) => {
    if (!record || (!record._id && !record.id)) {
      setToast({ message: 'معرف السجل غير صحيح', type: 'error', isOpen: true });
      return;
    }
    console.log('Editing record:', record);
    setEditingRecord(record);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!id || id === 'undefined') {
      setToast({ message: 'معرف السجل غير صحيح', type: 'error', isOpen: true });
      return;
    }
    if (!confirm('هل أنت متأكد من حذف هذا السجل؟')) return;

    try {
      console.log('Deleting record with ID:', id);
      await api.delete(`/attendance-records/${id}`);
      setToast({ message: 'تم الحذف بنجاح', type: 'success', isOpen: true });
      loadRecords();
    } catch (error: any) {
      console.error('Delete error:', error.response?.data);
      setToast({ message: error.response?.data?.message || 'فشل الحذف', type: 'error', isOpen: true });
    }
  };

  const openLocationOnMap = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  const viewSelfie = (record: any) => {
    if (record.selfiePhoto) {
      setSelectedSelfie({
        photo: record.selfiePhoto,
        timestamp: new Date(record.selfieTimestamp),
        deviceInfo: record.selfieDeviceInfo
      });
      setShowSelfieModal(true);
    }
  };

  const getAuthMethodBadge = (authMethod: string, hasSelfie: boolean, isManualEntry?: boolean) => {
    // الأولوية: manual > location > ip > bypass
    // نعرض manual إذا كان isManualEntry أو authMethod === 'manual'
    if (isManualEntry || authMethod === 'manual') {
      return (
        <Badge variant="primary" size="sm">
          <Edit2 className="w-3 h-3 ml-1" />
          يدوي
        </Badge>
      );
    }

    switch (authMethod) {
      case 'location':
        return (
          <Badge variant="success" size="sm">
            <MapPin className="w-3 h-3 ml-1" />
            موقع GPS
          </Badge>
        );
      case 'ip':
        return (
          <Badge variant="info" size="sm">
            <Wifi className="w-3 h-3 ml-1" />
            WiFi
          </Badge>
        );
      case 'bypass':
        return (
          <Badge variant="warning" size="sm" className={hasSelfie ? 'cursor-pointer' : ''}>
            <Camera className="w-3 h-3 ml-1" />
            سيلفي
          </Badge>
        );
      default:
        return (
          <Badge variant="light" size="sm">
            <MapPin className="w-3 h-3 ml-1" />
            موقع
          </Badge>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge variant="success">حاضر</Badge>;
      case 'late':
        return <Badge variant="warning">متأخر</Badge>;
      case 'absent':
        return <Badge variant="error">غائب</Badge>;
      case 'leave':
        return <Badge variant="info">إجازة</Badge>;
      default:
        return <Badge variant="light">{status}</Badge>;
    }
  };

  if (!canViewAttendance) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-error-100 dark:bg-error-900/30 rounded-full flex items-center justify-center">
            <Lock className="w-10 h-10 text-error-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">ليس لديك صلاحية</h2>
          <p className="text-gray-600 dark:text-gray-400">لا يمكنك الوصول إلى إدارة الحضور</p>
        </div>
      </div>
    );
  }

  // Calculate summary statistics
  const presentDays = records.filter(r => r.status === 'present' || r.status === 'late').length;
  const absentDays = records.filter(r => r.status === 'absent').length;
  const leaveDays = records.filter(r => r.status === 'leave').length;
  const totalDelay = records.reduce((sum, r) => sum + (r.delay || 0), 0);
  const totalOvertime = records.reduce((sum, r) => sum + (r.overtime || 0), 0);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-100 dark:bg-brand-900/30 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            إدارة الحضور
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">مراجعة وتعديل سجلات الحضور</p>
        </div>
        {canWriteAttendance && (
          <Button onClick={() => { setEditingRecord(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" />
            إضافة سجل يدوي
          </Button>
        )}
      </div>

      {/* Statistics Cards */}
      {selectedEmployee && records.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="أيام الحضور"
            value={presentDays}
            icon={<CheckCircle className="w-6 h-6" />}
            iconColor="green"
          />
          <StatCard
            title="أيام الغياب"
            value={absentDays}
            icon={<XCircle className="w-6 h-6" />}
            iconColor="red"
          />
          <StatCard
            title="أيام الإجازة"
            value={leaveDays}
            icon={<Palmtree className="w-6 h-6" />}
            iconColor="blue"
          />
          <StatCard
            title="دقائق التأخير"
            value={totalDelay}
            icon={<Timer className="w-6 h-6" />}
            iconColor="orange"
          />
          <StatCard
            title="ساعات إضافية"
            value={totalOvertime.toFixed(1)}
            icon={<Clock className="w-6 h-6" />}
            iconColor="purple"
          />
        </div>
      )}

      {/* Filters */}
      <Card>
        <Card.Body>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الموظف</label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                <option value="">جميع الموظفين</option>
                {employees.map((emp: any) => (
                  <option key={emp.id} value={emp.userId?._id || emp.userId}>{emp.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">اليوم</label>
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                <option value="">كل أيام الشهر</option>
                {Array.from({ length: daysInMonth }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1} - {new Date(selectedYear, selectedMonth - 1, i + 1).toLocaleDateString('ar-EG', { weekday: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الشهر</label>
              <select
                value={selectedMonth}
                onChange={(e) => { setSelectedMonth(Number(e.target.value)); setSelectedDay(''); }}
                className="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(selectedYear, i).toLocaleDateString('ar-EG', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">السنة</label>
              <select
                value={selectedYear}
                onChange={(e) => { setSelectedYear(Number(e.target.value)); setSelectedDay(''); }}
                className="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - 2 + i;
                  return <option key={year} value={year}>{year}</option>;
                })}
              </select>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Records Table */}
      <Card>
        <Card.Body className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.Head>الموظف</Table.Head>
                  <Table.Head>التاريخ</Table.Head>
                  <Table.Head>الحضور</Table.Head>
                  <Table.Head>الانصراف</Table.Head>
                  <Table.Head>الحالة</Table.Head>
                  <Table.Head>التأخير</Table.Head>
                  <Table.Head>الموقع</Table.Head>
                  <Table.Head>النوع</Table.Head>
                  <Table.Head>إجراءات</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {records.length === 0 ? (
                  <Table.Row key="no-records">
                    <Table.Cell colSpan={9}>
                      <div className="flex flex-col items-center justify-center py-12">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                          <FileText className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400">لا توجد سجلات لهذا الشهر</p>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ) : records.map((record) => (
                  <Table.Row key={record._id}>
                    <Table.Cell>
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={record.userId?.avatar}
                          alt={record.userId?.name}
                          size="small"
                        />
                        <span className="font-medium text-gray-900 dark:text-white">
                          {record.userId?.name}
                        </span>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-gray-600 dark:text-gray-400">
                        {new Date(record.date).toLocaleDateString('ar-EG')}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                        <Clock className="w-4 h-4" />
                        {record.checkIn ? new Date(record.checkIn).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                        <Clock className="w-4 h-4" />
                        {record.checkOut ? new Date(record.checkOut).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      {getStatusBadge(record.status)}
                    </Table.Cell>
                    <Table.Cell>
                      <div className="space-y-1">
                        {record.delay > 0 && (
                          <div className="flex items-center gap-1">
                            <Badge variant="warning" size="sm">
                              <Timer className="w-3 h-3 ml-1" />
                              تأخير: {record.delay} دقيقة
                            </Badge>
                            {record.lateArrivalReason && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                ({record.lateArrivalReason})
                              </span>
                            )}
                          </div>
                        )}
                        {record.earlyLeaveMinutes > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <Badge variant="info" size="sm">
                              <ArrowLeft className="w-3 h-3 ml-1" />
                              مغادرة: {record.earlyLeaveMinutes} دقيقة
                            </Badge>
                            {record.earlyLeaveReason && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                ({record.earlyLeaveReason})
                              </span>
                            )}
                          </div>
                        )}
                        {record.permissionGrantedBy && (
                          <div className="flex items-center gap-1 mt-1">
                            <Badge variant="success" size="sm">
                              <Shield className="w-3 h-3 ml-1" />
                              إذن من مدير
                            </Badge>
                          </div>
                        )}
                        {/* Show deduction if exists */}
                        {record.deduction && record.deduction.amount > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <Badge variant="error" size="sm">
                              <TrendingDown className="w-3 h-3 ml-1" />
                              خصم: {record.deduction.amount} {record.deduction.type === 'hours' ? 'ساعة' : 'يوم'}
                            </Badge>
                            {record.deduction.reason && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                ({record.deduction.reason})
                              </span>
                            )}
                          </div>
                        )}
                        {!record.delay && !record.earlyLeaveMinutes && !record.deduction && (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      {record.checkInLocation?.latitude && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openLocationOnMap(record.checkInLocation.latitude, record.checkInLocation.longitude)}
                          className="text-success-600 hover:text-success-700"
                        >
                          <MapPin className="w-4 h-4" />
                          عرض
                        </Button>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex items-center gap-2">
                        {getAuthMethodBadge(record.authMethod, !!record.selfiePhoto, record.isManualEntry)}
                        {record.selfiePhoto && record.authMethod === 'bypass' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewSelfie(record)}
                            className="text-purple-600 hover:text-purple-700 p-1"
                            title="عرض صورة السيلفي"
                          >
                            <Image className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex items-center gap-2">
                        {canWriteAttendance && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              const recordId = record._id || record.id;
                              if (recordId) handleEdit(record);
                            }}
                            disabled={!record._id && !record.id}
                            className="text-brand-600 hover:text-brand-700 hover:bg-brand-50 dark:hover:bg-brand-900/20"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                        {canDeleteAttendance && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              const recordId = record._id || record.id;
                              if (recordId) handleDelete(recordId);
                            }}
                            disabled={!record._id && !record.id}
                            className="text-error-600 hover:text-error-700 hover:bg-error-50 dark:hover:bg-error-900/20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Monthly Calendar View */}
      {selectedEmployee && records.length > 0 && (
        <Card>
          <Card.Header>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-brand-500" />
              سجل شهر {new Date(selectedYear, selectedMonth - 1).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}
            </h2>
          </Card.Header>
          <Card.Body>
            <div className="grid grid-cols-7 gap-2">
              {/* Days Headers */}
              {['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map((day, idx) => (
                <div key={`day-${idx}`} className="text-center font-semibold text-gray-700 dark:text-gray-300 py-2 text-sm">{day}</div>
              ))}

              {/* ✅ FIX: Calculate first day of month to align calendar correctly */}
              {(() => {
                const firstDayOfMonth = new Date(selectedYear, selectedMonth - 1, 1).getDay(); // 0 = Sunday
                const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

                return (
                  <>
                    {/* Add blank cells before the 1st to align with correct weekday */}
                    {Array.from({ length: firstDayOfMonth }, (_, i) => (
                      <div key={`blank-${i}`} className="p-3" />
                    ))}

                    {/* Calendar Days */}
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const day = i + 1;
                      // ✅ Use Egypt timezone to match day correctly (fixes day 7 bug)
                      const record = records.find(r => toEgyptTime(r.date).getUTCDate() === day);

                return (
                  <div
                    key={day}
                    className={`p-3 border rounded-lg text-center transition-all ${
                      record?.status === 'present' ? 'bg-success-50 dark:bg-success-900/20 border-success-300 dark:border-success-700' :
                      record?.status === 'late' ? 'bg-warning-50 dark:bg-warning-900/20 border-warning-300 dark:border-warning-700' :
                      record?.status === 'absent' ? 'bg-error-50 dark:bg-error-900/20 border-error-300 dark:border-error-700' :
                      record?.status === 'leave' ? 'bg-info-50 dark:bg-info-900/20 border-info-300 dark:border-info-700' :
                      'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="font-bold text-lg text-gray-800 dark:text-white">{day}</div>
                    {record ? (
                      <div className="text-xs mt-1 space-y-1">
                        <div className="font-medium flex items-center justify-center gap-1">
                          {record.status === 'present' && <><CheckCircle className="w-3 h-3 text-success-500" /> <span className="text-success-600 dark:text-success-400">حاضر</span></>}
                          {record.status === 'late' && <><AlertCircle className="w-3 h-3 text-warning-500" /> <span className="text-warning-600 dark:text-warning-400">متأخر</span></>}
                          {record.status === 'absent' && <><XCircle className="w-3 h-3 text-error-500" /> <span className="text-error-600 dark:text-error-400">غائب</span></>}
                          {record.status === 'leave' && <><Palmtree className="w-3 h-3 text-info-500" /> <span className="text-info-600 dark:text-info-400">إجازة</span></>}
                        </div>
                        {record.checkIn && (
                          <div className="text-gray-600 dark:text-gray-400">
                            {new Date(record.checkIn).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                        {record.delay > 0 && (
                          <div className="text-warning-600 dark:text-warning-400 font-medium flex items-center justify-center gap-1">
                            <Timer className="w-3 h-3" /> {record.delay}د
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">-</div>
                    )}
                  </div>
                );
                    })}
                  </>
                );
              })()}
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditingRecord(null); }} title={editingRecord ? 'تعديل السجل' : 'إضافة سجل يدوي'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الموظف *</label>
            <select
              name="userId"
              required
              disabled={!!editingRecord}
              defaultValue={editingRecord?.userId?._id || editingRecord?.userId || ''}
              className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-gray-100 dark:disabled:bg-gray-700"
            >
              <option value="">اختر موظف</option>
              {employees.map((emp: any) => (
                <option key={emp.id} value={emp.userId?._id || emp.userId}>{emp.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">التاريخ *</label>
            <input
              type="date"
              name="date"
              required
              disabled={!!editingRecord}
              defaultValue={editingRecord ? toEgyptTime(editingRecord.date).toISOString().split('T')[0] : ''}
              className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-gray-100 dark:disabled:bg-gray-700"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">وقت الحضور</label>
              <input
                type="time"
                name="checkIn"
                defaultValue={editingRecord?.checkIn ? getEgyptTimeString(editingRecord.checkIn) : ''}
                className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">وقت الانصراف</label>
              <input
                type="time"
                name="checkOut"
                defaultValue={editingRecord?.checkOut ? getEgyptTimeString(editingRecord.checkOut) : ''}
                className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الحالة *</label>
            <select
              name="status"
              required
              defaultValue={editingRecord?.status || 'present'}
              className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            >
              <option value="present">حاضر</option>
              <option value="late">متأخر</option>
              <option value="absent">غائب</option>
              <option value="leave">إجازة</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">نوع الإجازة</label>
            <select
              name="leaveType"
              defaultValue={editingRecord?.leaveType || ''}
              className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            >
              <option value="">-- اختر --</option>
              <option value="annual">سنوية</option>
              <option value="emergency">طارئة</option>
              <option value="sick">مرضية</option>
              <option value="unpaid">بدون راتب</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">التأخير (دقيقة)</label>
              <input
                type="number"
                name="delay"
                defaultValue={editingRecord?.delay || 0}
                className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الوقت الإضافي (ساعة)</label>
              <input
                type="number"
                name="overtime"
                defaultValue={editingRecord?.overtime || 0}
                step="0.5"
                className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          </div>

          {/* Permission Section - Only for Managers */}
          {isManager && (
            <>
              <div className="col-span-2 border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-brand-500" />
                  أذونات الحضور (للمديرين فقط)
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    مغادرة مبكرة (دقيقة)
                  </label>
                  <input
                    type="number"
                    name="earlyLeaveMinutes"
                    min="0"
                    defaultValue={editingRecord?.earlyLeaveMinutes || 0}
                    className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    سبب المغادرة المبكرة
                  </label>
                  <input
                    type="text"
                    name="earlyLeaveReason"
                    defaultValue={editingRecord?.earlyLeaveReason || ''}
                    className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    placeholder="مثال: ظرف طارئ، موعد طبيب..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  سبب التأخير
                </label>
                <input
                  type="text"
                  name="lateArrivalReason"
                  defaultValue={editingRecord?.lateArrivalReason || ''}
                  className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  placeholder="مثال: زحمة مرور، ظرف طارئ..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ملاحظات الإذن
                </label>
                <textarea
                  name="permissionNotes"
                  defaultValue={editingRecord?.permissionNotes || ''}
                  rows={2}
                  className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  placeholder="ملاحظات إضافية عن الإذن (اختياري)..."
                />
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  سيتم تسجيل اسمك كمانح للإذن وتاريخ المنح تلقائياً
                </p>
              </div>

              {/* Deduction Section - Only for Managers */}
              <div className="col-span-2 border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-error-500" />
                  الخصومات (للمديرين فقط)
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    نوع الخصم
                  </label>
                  <select
                    name="deductionType"
                    defaultValue={editingRecord?.deduction?.type || ''}
                    className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  >
                    <option value="">بدون خصم</option>
                    <option value="hours">ساعات</option>
                    <option value="days">أيام</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    مقدار الخصم
                  </label>
                  <input
                    type="number"
                    name="deductionAmount"
                    min="0"
                    step="0.5"
                    defaultValue={editingRecord?.deduction?.amount || 0}
                    className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  سبب الخصم
                </label>
                <textarea
                  name="deductionReason"
                  defaultValue={editingRecord?.deduction?.reason || ''}
                  rows={2}
                  className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  placeholder="سبب الخصم (اختياري)..."
                />
              </div>

              <div className="p-3 bg-error-50 dark:bg-error-900/20 rounded-lg">
                <p className="text-sm text-error-700 dark:text-error-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  سيتم تسجيل اسمك كمضيف للخصم وتاريخ الإضافة تلقائياً
                </p>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              {editingRecord ? (
                <><CheckCircle className="w-4 h-4" /> تحديث</>
              ) : (
                <><Plus className="w-4 h-4" /> حفظ</>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={() => { setShowModal(false); setEditingRecord(null); }} className="flex-1">
              إلغاء
            </Button>
          </div>
        </form>
      </Modal>

      {/* Selfie View Modal */}
      <Modal isOpen={showSelfieModal} onClose={() => { setShowSelfieModal(false); setSelectedSelfie(null); }} title="صورة التحقق">
        {selectedSelfie && (
          <div className="space-y-4">
            <div className="relative aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
              <img
                src={selectedSelfie.photo}
                alt="Selfie verification"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Clock className="w-4 h-4" />
                <span>وقت التقاط الصورة:</span>
                <span className="font-medium text-gray-800 dark:text-white">
                  {selectedSelfie.timestamp.toLocaleString('ar-EG')}
                </span>
              </div>
              {selectedSelfie.deviceInfo && (
                <div className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                  <Smartphone className="w-4 h-4 mt-0.5" />
                  <span>الجهاز:</span>
                  <span className="font-medium text-gray-800 dark:text-white text-xs break-all">
                    {selectedSelfie.deviceInfo}
                  </span>
                </div>
              )}
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                ℹ️ هذه الصورة تم التقاطها للتحقق من هوية الموظف عند استخدام تجاوز فحص الموقع
              </p>
            </div>
          </div>
        )}
      </Modal>

      <Toast message={toast.message} type={toast.type} isOpen={toast.isOpen} onClose={() => setToast({ ...toast, isOpen: false })} />
    </div>
  );
};

export default AttendanceManagement;
