import React, { useState } from "react";
import { useDataStore } from "../store/dataStore";
import { useAuthStore } from "../store/authStore";
import { usePermissions } from "../hooks/usePermissions";
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Toast from '../components/Toast';
import { Card, StatCard, Badge, Button, Input, Textarea, Table } from '../components/ui';
import { TrendingUp, Wallet, Plus, Edit2, Trash2, Eye, Calculator, Calendar } from 'lucide-react';

type Currency = "EGP" | "USD" | "SAR" | "AED";

const Revenues: React.FC = () => {
  const { revenues, addRevenue, updateRevenue, deleteRevenue } = useDataStore();
  const { user } = useAuthStore();
  const { canWrite, canDelete } = usePermissions();

  const canCreateRevenue = canWrite('revenues');
  const canEditRevenue = canWrite('revenues');
  const canDeleteRevenue = canDelete('revenues');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{message: string; type: 'success' | 'error' | 'info' | 'warning'; isOpen: boolean}>({message: '', type: 'success', isOpen: false});
  const [showTotalModal, setShowTotalModal] = useState(false);
  const [selectedTotalCurrency, setSelectedTotalCurrency] = useState<Currency>('SAR');
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [isCalculating, setIsCalculating] = useState(false);

  const [formData, setFormData] = useState({
    amount: "" as number | "",
    currency: "SAR" as Currency,
    description: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
    source: "",
    revenueType: "subscription" as "subscription" | "clothing" | "website" | "other",
    nationality: "saudi" as "egyptian" | "saudi" | "foreign" | "emirati",
    clientName: "",
    clientPhone: "",
    clientEmail: "",
    gender: "" as "male" | "female" | "",
    clothingType: "",
    websiteName: "",
  });

  const getCurrencySymbol = (c: Currency) => {
    switch (c) {
      case "EGP": return "ج.م";
      case "SAR": return "ر.س";
      case "USD": return "$";
      case "AED": return "د.إ";
      default: return "";
    }
  };

  const filteredRevenues = revenues.filter(r => {
    const revenueDate = new Date(r.date);
    return revenueDate.getMonth() + 1 === selectedMonth && revenueDate.getFullYear() === selectedYear;
  });

  const revenuesByCurrency = {
    EGP: filteredRevenues.filter(r => r.currency === 'EGP').reduce((sum, r) => sum + r.amount, 0),
    SAR: filteredRevenues.filter(r => r.currency === 'SAR').reduce((sum, r) => sum + r.amount, 0),
    USD: filteredRevenues.filter(r => r.currency === 'USD').reduce((sum, r) => sum + r.amount, 0),
    AED: filteredRevenues.filter(r => r.currency === 'AED').reduce((sum, r) => sum + r.amount, 0)
  };

  const openAdd = () => {
    if (!canCreateRevenue) {
      setToast({message: 'ليس لديك صلاحية لإضافة إيرادات', type: 'error', isOpen: true});
      return;
    }
    setEditing(null);
    setFormData({
      amount: "",
      currency: "SAR",
      description: "",
      date: new Date().toISOString().split("T")[0],
      notes: "",
      source: "",
      revenueType: "subscription",
      nationality: "saudi",
      clientName: "",
      clientPhone: "",
      clientEmail: "",
      gender: "",
      clothingType: "",
      websiteName: "",
    });
    setShowModal(true);
  };

  const openEdit = (r: any) => {
    if (!canEditRevenue) {
      setToast({message: 'ليس لديك صلاحية لتعديل الإيرادات', type: 'error', isOpen: true});
      return;
    }
    setEditing(r);
    setFormData({
      amount: r.amount,
      currency: r.currency as Currency,
      description: r.description || "",
      date: new Date(r.date).toISOString().split("T")[0],
      notes: r.notes || "",
      source: r.source || "",
      revenueType: (r.category as any) || "subscription",
      nationality: "saudi",
      clientName: r.source || "",
      clientPhone: "",
      clientEmail: "",
      gender: "",
      clothingType: "",
      websiteName: "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing && !canEditRevenue) {
      setToast({message: 'ليس لديك صلاحية لتعديل الإيرادات', type: 'error', isOpen: true});
      return;
    }
    if (!editing && !canCreateRevenue) {
      setToast({message: 'ليس لديك صلاحية لإضافة إيرادات', type: 'error', isOpen: true});
      return;
    }

    const payload: any = {
      title: formData.clientName || formData.description || 'إيراد',
      amount: Number(formData.amount) || 0,
      currency: formData.currency,
      description: formData.description,
      date: new Date(formData.date),
      category: formData.revenueType,
      notes: formData.notes,
      source: formData.clientName || formData.source || 'غير محدد',
      exchangeRate: 1,
      baseAmount: Number(formData.amount) || 0,
    };
    if (user?.companyId) payload.companyId = user.companyId;
    if (user?.id) payload.createdBy = user.id;

    try {
      if (editing) {
        await updateRevenue(editing.id, payload);
        setToast({message: 'تم تحديث الإيراد بنجاح', type: 'success', isOpen: true});
      } else {
        await addRevenue(payload);
        setToast({message: 'تم إضافة الإيراد بنجاح', type: 'success', isOpen: true});
      }
      setShowModal(false);
    } catch (error: any) {
      console.error('Revenue error:', error);
      const errorMsg = error?.response?.data?.message || error?.message || 'حدث خطأ أثناء الحفظ';
      setToast({message: errorMsg, type: 'error', isOpen: true});
    }
  };

  const handleDelete = (id: string) => {
    if (!canDeleteRevenue) {
      setToast({message: 'ليس لديك صلاحية لحذف الإيرادات', type: 'error', isOpen: true});
      return;
    }
    setDeleteId(id);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteRevenue(deleteId);
      setToast({message: 'تم حذف الإيراد بنجاح', type: 'success', isOpen: true});
      setDeleteId(null);
    }
  };

  const getExchangeRates = async (targetCurrency: Currency) => {
    try {
      const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${targetCurrency}`);
      const data = await response.json();
      return data.rates;
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      const fallbackRates: Record<Currency, Record<Currency, number>> = {
        SAR: { EGP: 8.5, USD: 0.27, AED: 0.98, SAR: 1 },
        EGP: { SAR: 0.12, USD: 0.032, AED: 0.115, EGP: 1 },
        USD: { SAR: 3.75, EGP: 31.5, AED: 3.67, USD: 1 },
        AED: { SAR: 1.02, EGP: 8.7, USD: 0.27, AED: 1 }
      };
      return fallbackRates[targetCurrency];
    }
  };

  const calculateTotalRevenues = async (targetCurrency: Currency) => {
    setIsCalculating(true);
    try {
      const rates = await getExchangeRates(targetCurrency);
      let total = 0;

      Object.entries(revenuesByCurrency).forEach(([currency, amount]) => {
        if (currency === targetCurrency) {
          total += amount;
        } else {
          const rate = rates[currency as Currency] || 1;
          total += amount / rate;
        }
      });

      setTotalAmount(total);
      setSelectedTotalCurrency(targetCurrency);
      setShowTotalModal(true);
    } catch (error) {
      setToast({message: 'حدث خطأ في حساب الإجمالي', type: 'error', isOpen: true});
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">الإيرادات</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">إدارة إيرادات الشركة</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setShowTotalModal(true)}
            variant="outline"
            className="gap-2"
          >
            <Calculator className="w-4 h-4" />
            إجمالي الإيرادات
          </Button>
          {canCreateRevenue && (
            <Button
              onClick={openAdd}
              variant="primary"
              className="gap-2 bg-success-500 hover:bg-success-600"
            >
              <Plus className="w-4 h-4" />
              إضافة إيراد
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <Card.Body className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الشهر</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                {Array.from({length: 12}, (_, i) => (
                  <option key={i+1} value={i+1}>
                    {new Date(selectedYear, i).toLocaleDateString('ar-EG', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">السنة</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                {Array.from({length: 5}, (_, i) => {
                  const y = 2025 + i;
                  return (<option key={y} value={y}>{y}</option>);
                })}
              </select>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="جنيه مصري (EGP)"
          value={`${revenuesByCurrency.EGP.toLocaleString()} ج.م`}
          icon={<Wallet className="w-6 h-6" />}
          iconColor="green"
        />
        <StatCard
          title="ريال سعودي (SAR)"
          value={`${revenuesByCurrency.SAR.toLocaleString()} ر.س`}
          icon={<Wallet className="w-6 h-6" />}
          iconColor="blue"
        />
        <StatCard
          title="دولار أمريكي (USD)"
          value={`${revenuesByCurrency.USD.toLocaleString()} $`}
          icon={<Wallet className="w-6 h-6" />}
          iconColor="purple"
        />
        <StatCard
          title="درهم إماراتي (AED)"
          value={`${revenuesByCurrency.AED.toLocaleString()} د.إ`}
          icon={<Wallet className="w-6 h-6" />}
          iconColor="orange"
        />
      </div>

      {/* Revenues Table */}
      <Card>
        <Card.Header>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            إيرادات {new Date(selectedYear, selectedMonth-1).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}
          </h2>
        </Card.Header>
        <Card.Body className="p-0">
          {filteredRevenues.length === 0 ? (
            <div className="p-12 text-center">
              <TrendingUp className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-xl font-medium text-gray-600 dark:text-gray-400 mb-2">لا توجد إيرادات</h3>
              <p className="text-gray-500 dark:text-gray-500 mb-6">لا توجد إيرادات لهذا الشهر</p>
              {canCreateRevenue && (
                <Button onClick={openAdd} variant="primary" className="gap-2 bg-success-500 hover:bg-success-600">
                  <Plus className="w-4 h-4" />
                  إضافة إيراد
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.Head>التاريخ</Table.Head>
                  <Table.Head>العميل/المصدر</Table.Head>
                  <Table.Head>الوصف</Table.Head>
                  <Table.Head>المبلغ</Table.Head>
                  <Table.Head>النوع</Table.Head>
                  <Table.Head>الإجراءات</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {filteredRevenues.map((revenue) => (
                  <Table.Row key={revenue.id}>
                    <Table.Cell>
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Calendar className="w-4 h-4" />
                        {new Date(revenue.date).toLocaleDateString('ar-EG')}
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {revenue.source || 'غير محدد'}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-gray-600 dark:text-gray-400">
                        {revenue.description || '-'}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-lg font-semibold text-success-600 dark:text-success-400">
                        {revenue.amount.toLocaleString()} {getCurrencySymbol(revenue.currency as Currency)}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge variant="primary">
                        {revenue.category || 'عام'}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex items-center gap-2">
                        {canEditRevenue && (
                          <button
                            onClick={() => openEdit(revenue)}
                            className="p-2 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/20 text-gray-500 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400 transition-colors"
                            title="تعديل"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {canDeleteRevenue && (
                          <button
                            onClick={() => handleDelete(revenue.id)}
                            className="p-2 rounded-lg hover:bg-error-50 dark:hover:bg-error-900/20 text-gray-500 hover:text-error-600 dark:text-gray-400 dark:hover:text-error-400 transition-colors"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        {!canEditRevenue && !canDeleteRevenue && (
                          <span className="text-gray-400 dark:text-gray-500 text-sm flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            عرض فقط
                          </span>
                        )}
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'تعديل الإيراد' : 'إضافة إيراد جديد'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              type="number"
              label="المبلغ *"
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: Number(e.target.value) || ""})}
              required
              min="0"
              step="0.01"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">العملة</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({...formData, currency: e.target.value as Currency})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                <option value="SAR">ريال سعودي (ر.س)</option>
                <option value="EGP">جنيه مصري (ج.م)</option>
                <option value="USD">دولار أمريكي ($)</option>
                <option value="AED">درهم إماراتي (د.إ)</option>
              </select>
            </div>
          </div>

          <Input
            label="الوصف"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            placeholder="وصف الإيراد"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              type="date"
              label="التاريخ *"
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نوع الإيراد</label>
              <select
                value={formData.revenueType}
                onChange={(e) => setFormData({...formData, revenueType: e.target.value as any})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                <option value="subscription">اشتراك</option>
                <option value="clothing">ملابس</option>
                <option value="website">موقع إلكتروني</option>
                <option value="other">أخرى</option>
              </select>
            </div>
          </div>

          <Input
            label="اسم العميل/المصدر"
            value={formData.clientName}
            onChange={(e) => setFormData({...formData, clientName: e.target.value})}
            placeholder="اسم العميل أو مصدر الإيراد"
          />

          <Textarea
            label="ملاحظات"
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
            rows={3}
            placeholder="ملاحظات إضافية"
          />

          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button type="submit" variant="primary" className="flex-1 bg-success-500 hover:bg-success-600">
              {editing ? 'تحديث' : 'إضافة'}
            </Button>
            <Button type="button" onClick={() => setShowModal(false)} variant="outline" className="flex-1">
              إلغاء
            </Button>
          </div>
        </form>
      </Modal>

      {/* Total Revenues Modal */}
      <Modal
        isOpen={showTotalModal}
        onClose={() => setShowTotalModal(false)}
        title="إجمالي الإيرادات"
        size="md"
      >
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              إجمالي إيرادات {new Date(selectedYear, selectedMonth-1).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}
            </h3>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {Object.entries(revenuesByCurrency).map(([currency, amount]) => (
                <Card key={currency} className="bg-gray-50 dark:bg-gray-900">
                  <Card.Body className="p-4 text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">{currency}</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {amount.toLocaleString()} {getCurrencySymbol(currency as Currency)}
                    </p>
                  </Card.Body>
                </Card>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">تحويل إلى عملة واحدة:</h4>
            <div className="flex gap-2 mb-4">
              {(['SAR', 'EGP', 'USD', 'AED'] as Currency[]).map((currency) => (
                <Button
                  key={currency}
                  onClick={() => calculateTotalRevenues(currency)}
                  disabled={isCalculating}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  {isCalculating ? '...' : getCurrencySymbol(currency)}
                </Button>
              ))}
            </div>

            {totalAmount > 0 && (
              <Card className="bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-800">
                <Card.Body className="p-4 text-center">
                  <p className="text-sm text-success-600 dark:text-success-400 mb-1">الإجمالي بعملة {selectedTotalCurrency}</p>
                  <p className="text-2xl font-bold text-success-700 dark:text-success-300">
                    {totalAmount.toLocaleString(undefined, {maximumFractionDigits: 2})} {getCurrencySymbol(selectedTotalCurrency)}
                  </p>
                </Card.Body>
              </Card>
            )}
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDelete}
        title="حذف الإيراد"
        message="هل أنت متأكد من حذف هذا الإيراد؟ لا يمكن التراجع عن هذا الإجراء."
        type="danger"
      />

      {/* Toast Notifications */}
      <Toast
        isOpen={toast.isOpen}
        onClose={() => setToast({...toast, isOpen: false})}
        message={toast.message}
        type={toast.type}
      />
    </div>
  );
};

export default Revenues;
