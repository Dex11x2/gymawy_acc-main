import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { useDataStore } from '../store/dataStore';
import { usePermissions } from '../hooks/usePermissions';
import Modal from '../components/Modal';
import { Card, StatCard, Badge, Button, Table, Avatar } from '../components/ui';
import {
  Star,
  Plus,
  Lock,
  Users,
  BarChart3,
  Calendar,
  AlertTriangle,
  MessageSquare,
  TrendingUp,
  Award,
  Target,
  FileText,
  Send,
  X,
  Save
} from 'lucide-react';

const EmployeeReviews: React.FC = () => {
  const { user } = useAuthStore();
  const { employees: allEmployees, loadEmployees } = useDataStore();
  const { addNotification } = useNotificationStore();
  const { canRead, canWrite } = usePermissions();

  const canViewReviews = canRead('reviews');
  const canWriteReviews = canWrite('reviews');

  useEffect(() => {
    if (loadEmployees) loadEmployees();
  }, []);

  const [showModal, setShowModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [formData, setFormData] = useState({
    rating: 5,
    performance: '',
    strengths: '',
    improvements: '',
    notes: ''
  });

  const { reviews: apiReviews, addReview, loadReviews, addReviewComment } = useDataStore();
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [showReviewDetails, setShowReviewDetails] = useState(false);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    loadReviews();
  }, []);

  const reviews = (apiReviews || []).map((r: any) => ({
    ...r,
    id: r._id || r.id,
    employeeId: String(r.employeeId?._id || r.employeeId),
    employeeName: r.employeeId?.name || r.employeeName || 'غير محدد',
    reviewerId: String(r.reviewerId?._id || r.reviewerId),
    reviewerName: r.reviewerId?.name || r.reviewerName || 'غير محدد',
    comments: r.comments || []
  }));

  const employees = user?.role === 'super_admin'
    ? (allEmployees || [])
    : (allEmployees || []).filter((emp: any) =>
        emp.companyId === user?.companyId && emp.id !== user?.id
      );

  const currentEmployee = employees.find((e: any) => e.id === user?.id);
  const isManager = currentEmployee?.isGeneralManager || currentEmployee?.isAdministrativeManager || user?.role === 'super_admin';

  if (!canViewReviews) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-error-100 dark:bg-error-900/30 rounded-full flex items-center justify-center">
            <Lock className="w-10 h-10 text-error-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">ليس لديك صلاحية</h2>
          <p className="text-gray-600 dark:text-gray-400">لا يمكنك الوصول إلى تقييمات الموظفين</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const employee = employees.find((e: any) => e.id === selectedEmployee);
    if (!employee) return;

    try {
      await addReview({
        employeeId: selectedEmployee,
        rating: formData.rating,
        comment: `${formData.performance || ''} ${formData.strengths || ''} ${formData.improvements || ''} ${formData.notes || ''}`.trim(),
        category: 'general'
      });

      addNotification({
        userId: selectedEmployee,
        type: 'system',
        title: 'تقييم جديد',
        message: `تم إضافة تقييم جديد لك بدرجة ${formData.rating} نجوم`,
        link: '/reviews'
      });

      setShowModal(false);
      setSelectedEmployee('');
      setFormData({
        rating: 5,
        performance: '',
        strengths: '',
        improvements: '',
        notes: ''
      });
    } catch (error) {
      console.error('Error adding review:', error);
    }
  };

  const getEmployeeReviews = (employeeId: string | number) => {
    return reviews.filter(r => r.employeeId === String(employeeId));
  };

  const getAverageRating = (employeeId: string | number) => {
    const empReviews = getEmployeeReviews(employeeId);
    if (empReviews.length === 0) return '0';
    const sum = empReviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / empReviews.length).toFixed(1);
  };

  const getRatingBadgeVariant = (rating: number): 'success' | 'error' | 'warning' | 'info' | 'light' => {
    if (rating >= 4.5) return 'success';
    if (rating >= 3.5) return 'info';
    if (rating >= 2.5) return 'warning';
    return 'error';
  };

  // Employee's own reviews
  const myReviews = reviews.filter(r => r.employeeId === String(user?.id));
  const isEmployee = !isManager;

  if (isEmployee) {
    return (
      <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
              <div className="w-10 h-10 bg-warning-100 dark:bg-warning-900/30 rounded-xl flex items-center justify-center">
                <Star className="w-5 h-5 text-warning-600 dark:text-warning-400" />
              </div>
              تقييماتي
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">شاهد تقييمات المدراء لك</p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="إجمالي التقييمات"
            value={myReviews.length}
            icon={<BarChart3 className="w-6 h-6" />}
            iconColor="blue"
          />
          <StatCard
            title="متوسط التقييم"
            value={`${myReviews.length > 0
              ? (myReviews.reduce((acc, r) => acc + r.rating, 0) / myReviews.length).toFixed(1)
              : '0.0'
            }`}
            icon={<Star className="w-6 h-6" />}
            iconColor="orange"
          />
          <StatCard
            title="آخر تقييم"
            value={myReviews.length > 0
              ? new Date(myReviews[0].date).toLocaleDateString('ar-EG', { calendar: 'gregory' })
              : 'لا يوجد'
            }
            icon={<Calendar className="w-6 h-6" />}
            iconColor="green"
          />
        </div>

        {/* My Reviews */}
        {myReviews.length === 0 ? (
          <Card>
            <Card.Body className="py-12">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-warning-100 dark:bg-warning-900/30 rounded-full flex items-center justify-center mb-4">
                  <Star className="w-8 h-8 text-warning-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">لا توجد تقييمات بعد</h3>
                <p className="text-gray-500 dark:text-gray-500">سيتم عرض تقييمات المدراء هنا</p>
              </div>
            </Card.Body>
          </Card>
        ) : (
          <Card>
            <Card.Header>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">تقييماتي</h2>
            </Card.Header>
            <Card.Body className="p-6 space-y-4">
              {myReviews.map((review) => (
                <div key={review.id} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar alt={review.reviewerName} size="medium" />
                      <div>
                        <h3 className="font-bold text-gray-800 dark:text-white">{review.reviewerName}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(review.date).toLocaleDateString('ar-EG', { calendar: 'gregory' })}
                        </p>
                      </div>
                    </div>
                    <Badge variant={getRatingBadgeVariant(review.rating)}>
                      <Star className="w-3 h-3 ml-1" />
                      {review.rating}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {review.performance && (
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">الأداء:</p>
                        <p className="text-gray-800 dark:text-white">{review.performance}</p>
                      </div>
                    )}
                    {review.strengths && (
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">نقاط القوة:</p>
                        <p className="text-gray-800 dark:text-white">{review.strengths}</p>
                      </div>
                    )}
                    {review.improvements && (
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">مجالات التحسين:</p>
                        <p className="text-gray-800 dark:text-white">{review.improvements}</p>
                      </div>
                    )}
                    {review.notes && (
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">ملاحظات:</p>
                        <p className="text-gray-800 dark:text-white">{review.notes}</p>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedReview(review);
                      setShowReviewDetails(true);
                    }}
                    className="text-brand-600 hover:text-brand-700"
                  >
                    <MessageSquare className="w-4 h-4" />
                    عرض التعليقات والرد
                  </Button>
                </div>
              ))}
            </Card.Body>
          </Card>
        )}

        {/* Review Details Modal */}
        <Modal
          isOpen={showReviewDetails}
          onClose={() => {
            setShowReviewDetails(false);
            setSelectedReview(null);
            setNewComment('');
          }}
          title="تفاصيل التقييم"
          size="lg"
        >
          {selectedReview && (
            <div className="space-y-6">
              <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar alt={selectedReview.reviewerName} size="medium" />
                    <div>
                      <h3 className="font-bold text-gray-800 dark:text-white">{selectedReview.reviewerName}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(selectedReview.date).toLocaleDateString('ar-EG')}
                      </p>
                    </div>
                  </div>
                  <Badge variant="warning">
                    <Star className="w-3 h-3 ml-1" />
                    {selectedReview.rating}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {selectedReview.performance && (
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">الأداء:</p>
                      <p className="text-gray-800 dark:text-white">{selectedReview.performance}</p>
                    </div>
                  )}
                  {selectedReview.strengths && (
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">نقاط القوة:</p>
                      <p className="text-gray-800 dark:text-white">{selectedReview.strengths}</p>
                    </div>
                  )}
                  {selectedReview.improvements && (
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">مجالات التحسين:</p>
                      <p className="text-gray-800 dark:text-white">{selectedReview.improvements}</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  التعليقات ({(selectedReview.comments || []).length})
                </h3>

                <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                  {(!selectedReview.comments || selectedReview.comments.length === 0) ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-4">لا توجد تعليقات بعد</p>
                  ) : (
                    selectedReview.comments.map((comment: any, idx: number) => (
                      <div key={idx} className="bg-white dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Avatar alt={comment.authorName} size="xsmall" />
                            <span className="font-medium text-gray-800 dark:text-white">{comment.authorName}</span>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(comment.createdAt).toLocaleString('ar-EG')}
                          </span>
                        </div>
                        <p className="text-gray-700 dark:text-gray-200">{comment.content}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyPress={async (e) => {
                      if (e.key === 'Enter' && newComment.trim()) {
                        try {
                          await addReviewComment(selectedReview.id, newComment);
                          setNewComment('');
                          const updatedReviews = await useDataStore.getState().reviews;
                          const updated = updatedReviews.find((r: any) => r.id === selectedReview.id);
                          if (updated) setSelectedReview(updated);
                        } catch (error) {
                          console.error('Error adding comment:', error);
                        }
                      }
                    }}
                    className="flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    placeholder="اكتب تعليقاً..."
                  />
                  <Button
                    onClick={async () => {
                      if (newComment.trim()) {
                        try {
                          await addReviewComment(selectedReview.id, newComment);
                          setNewComment('');
                        } catch (error) {
                          console.error('Error adding comment:', error);
                        }
                      }
                    }}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Modal>
      </div>
    );
  }

  // Manager View
  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-warning-100 dark:bg-warning-900/30 rounded-xl flex items-center justify-center">
              <Star className="w-5 h-5 text-warning-600 dark:text-warning-400" />
            </div>
            تقييمات الموظفين
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">إدارة وتقييم أداء الموظفين</p>
        </div>
        {canWriteReviews && (
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" />
            إضافة تقييم جديد
          </Button>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="إجمالي التقييمات"
          value={reviews.length}
          icon={<BarChart3 className="w-6 h-6" />}
          iconColor="blue"
        />
        <StatCard
          title="موظفين مُقيّمين"
          value={new Set(reviews.map(r => r.employeeId)).size}
          icon={<Users className="w-6 h-6" />}
          iconColor="green"
        />
        <StatCard
          title="متوسط التقييم"
          value={`${reviews.length > 0
            ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
            : '0.0'
          }`}
          icon={<Star className="w-6 h-6" />}
          iconColor="orange"
        />
        <StatCard
          title="موظفين بدون تقييم"
          value={employees.length - new Set(reviews.map(r => r.employeeId)).size}
          icon={<AlertTriangle className="w-6 h-6" />}
          iconColor="red"
        />
      </div>

      {/* Employees Table */}
      <Card>
        <Card.Header>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">قائمة الموظفين والتقييمات</h2>
        </Card.Header>
        <Card.Body className="p-0">
          {employees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-brand-100 dark:bg-brand-900/30 rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-brand-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">لا يوجد موظفين</h3>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.Head>الموظف</Table.Head>
                    <Table.Head>القسم</Table.Head>
                    <Table.Head>عدد التقييمات</Table.Head>
                    <Table.Head>متوسط التقييم</Table.Head>
                    <Table.Head>آخر تقييم</Table.Head>
                    <Table.Head>الإجراءات</Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {employees.map((employee: any) => {
                    const empReviews = getEmployeeReviews(employee.id);
                    const avgRating = parseFloat(getAverageRating(employee.id));
                    const lastReview = empReviews[0];

                    return (
                      <Table.Row key={employee.id}>
                        <Table.Cell>
                          <div className="flex items-center gap-3">
                            <Avatar alt={employee.name} size="small" />
                            <div>
                              <p className="font-medium text-gray-800 dark:text-white">{employee.name}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{employee.position}</p>
                            </div>
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          <span className="text-gray-600 dark:text-gray-400">{employee.department || '-'}</span>
                        </Table.Cell>
                        <Table.Cell>
                          <Badge variant="info">{empReviews.length}</Badge>
                        </Table.Cell>
                        <Table.Cell>
                          {avgRating > 0 ? (
                            <Badge variant={getRatingBadgeVariant(avgRating)}>
                              <Star className="w-3 h-3 ml-1" />
                              {avgRating}
                            </Badge>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500 text-sm">لا يوجد</span>
                          )}
                        </Table.Cell>
                        <Table.Cell>
                          <span className="text-gray-600 dark:text-gray-400 text-sm">
                            {lastReview
                              ? new Date(lastReview.date).toLocaleDateString('ar-EG', { calendar: 'gregory' })
                              : '-'
                            }
                          </span>
                        </Table.Cell>
                        <Table.Cell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedEmployee(String(employee.id));
                              setShowModal(true);
                            }}
                            className="text-brand-600 hover:text-brand-700"
                          >
                            <Plus className="w-4 h-4" />
                            إضافة تقييم
                          </Button>
                        </Table.Cell>
                      </Table.Row>
                    );
                  })}
                </Table.Body>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Recent Reviews */}
      {reviews.length > 0 && (
        <Card>
          <Card.Header>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">آخر التقييمات</h2>
          </Card.Header>
          <Card.Body className="p-6 space-y-4">
            {reviews.slice(0, 5).map((review) => (
              <div key={review.id} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar alt={review.employeeName} size="medium" />
                    <div>
                      <h3 className="font-bold text-gray-800 dark:text-white">{review.employeeName}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        بواسطة: {review.reviewerName} - {new Date(review.date).toLocaleDateString('ar-EG', { calendar: 'gregory' })}
                      </p>
                    </div>
                  </div>
                  <Badge variant={getRatingBadgeVariant(review.rating)}>
                    <Star className="w-3 h-3 ml-1" />
                    {review.rating}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {review.performance && (
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" />
                        الأداء:
                      </p>
                      <p className="text-gray-800 dark:text-white">{review.performance}</p>
                    </div>
                  )}
                  {review.strengths && (
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
                        <Award className="w-4 h-4" />
                        نقاط القوة:
                      </p>
                      <p className="text-gray-800 dark:text-white">{review.strengths}</p>
                    </div>
                  )}
                  {review.improvements && (
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
                        <Target className="w-4 h-4" />
                        مجالات التحسين:
                      </p>
                      <p className="text-gray-800 dark:text-white">{review.improvements}</p>
                    </div>
                  )}
                  {review.notes && (
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        ملاحظات:
                      </p>
                      <p className="text-gray-800 dark:text-white">{review.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </Card.Body>
        </Card>
      )}

      {/* Add Review Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedEmployee('');
          setFormData({
            rating: 5,
            performance: '',
            strengths: '',
            improvements: '',
            notes: ''
          });
        }}
        title="إضافة تقييم جديد"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الموظف *</label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              required
            >
              <option value="">اختر الموظف</option>
              {employees.map((emp: any) => (
                <option key={emp.id} value={emp.id}>{emp.name} - {emp.position}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">التقييم * (من 1 إلى 5)</label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="5"
                step="0.5"
                value={formData.rating}
                onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) })}
                className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <Badge variant="warning" className="min-w-[60px] justify-center">
                <Star className="w-4 h-4 ml-1" />
                {formData.rating}
              </Badge>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">تقييم الأداء</label>
            <textarea
              value={formData.performance}
              onChange={(e) => setFormData({ ...formData, performance: e.target.value })}
              className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              rows={3}
              placeholder="وصف أداء الموظف..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">نقاط القوة</label>
            <textarea
              value={formData.strengths}
              onChange={(e) => setFormData({ ...formData, strengths: e.target.value })}
              className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              rows={3}
              placeholder="ما هي نقاط القوة لدى الموظف؟"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">مجالات التحسين</label>
            <textarea
              value={formData.improvements}
              onChange={(e) => setFormData({ ...formData, improvements: e.target.value })}
              className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              rows={3}
              placeholder="ما هي المجالات التي يحتاج الموظف لتحسينها؟"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">ملاحظات إضافية</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              rows={2}
              placeholder="أي ملاحظات أخرى..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              <Save className="w-4 h-4" />
              حفظ التقييم
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowModal(false);
                setSelectedEmployee('');
                setFormData({
                  rating: 5,
                  performance: '',
                  strengths: '',
                  improvements: '',
                  notes: ''
                });
              }}
              className="flex-1"
            >
              <X className="w-4 h-4" />
              إلغاء
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default EmployeeReviews;
