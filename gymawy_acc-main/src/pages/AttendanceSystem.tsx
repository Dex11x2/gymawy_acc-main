import React, { useState, useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { useDataStore } from "../store/dataStore";
import api from "../services/api";
import Toast from "../components/Toast";
import Modal from "../components/Modal";

const AttendanceSystem: React.FC = () => {
  const { user } = useAuthStore();
  const { employees } = useDataStore();
  const [viewMode, setViewMode] = useState<"daily" | "monthly">("daily");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [dailyRecords, setDailyRecords] = useState<any[]>([]);
  const [monthlyReport, setMonthlyReport] = useState<any[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [toast, setToast] = useState({ message: "", type: "success" as any, isOpen: false });

  const isAdmin = user?.role === "super_admin" || user?.role === "administrative_manager";

  useEffect(() => {
    if (viewMode === "daily") {
      loadDailyRecords();
    } else {
      loadMonthlyReport();
    }
  }, [viewMode, selectedDate, selectedMonth, selectedYear]);

  const loadDailyRecords = async () => {
    try {
      const response = await api.get("/attendance/daily", {
        params: { date: selectedDate }
      });
      setDailyRecords(response.data);
    } catch (error) {
      console.error("Error loading daily records:", error);
    }
  };

  const loadMonthlyReport = async () => {
    try {
      const response = await api.get("/attendance/monthly", {
        params: { month: selectedMonth, year: selectedYear }
      });
      setMonthlyReport(response.data);
    } catch (error) {
      console.error("Error loading monthly report:", error);
    }
  };

  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const data: any = {
      employeeId: formData.get("employeeId"),
      date: formData.get("date"),
      status: formData.get("status"),
      checkIn: formData.get("checkIn") || undefined,
      checkOut: formData.get("checkOut") || undefined,
      lateMinutes: Number(formData.get("lateMinutes")) || 0,
      overtime: Number(formData.get("overtime")) || 0,
      leaveType: formData.get("leaveType") || undefined,
      notes: formData.get("notes") || undefined,
      confirmed: true
    };

    try {
      if (editingRecord?.id) {
        await api.put(`/attendance/${editingRecord.id}`, data);
        setToast({ message: "تم التحديث بنجاح", type: "success", isOpen: true });
      } else {
        await api.post("/attendance", data);
        setToast({ message: "تم الحفظ بنجاح", type: "success", isOpen: true });
      }
      setShowEditModal(false);
      loadDailyRecords();
    } catch (error: any) {
      setToast({ message: error.response?.data?.message || "فشل الحفظ", type: "error", isOpen: true });
    }
  };

  const handleConfirmDay = async () => {
    try {
      await api.post("/attendance/confirm-day", { date: selectedDate });
      setToast({ message: "تم تأكيد اليوم بنجاح", type: "success", isOpen: true });
      loadDailyRecords();
    } catch (error: any) {
      setToast({ message: error.response?.data?.message || "فشل التأكيد", type: "error", isOpen: true });
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      present: "bg-green-100 text-green-800",
      late: "bg-yellow-100 text-yellow-800",
      absent: "bg-red-100 text-red-800",
      leave: "bg-blue-100 text-blue-800",
      official_holiday: "bg-purple-100 text-purple-800"
    };
    const labels = {
      present: "✅ حاضر",
      late: "⏰ متأخر",
      absent: "❌ غائب",
      leave: "🌴 إجازة",
      official_holiday: "🎉 عطلة رسمية"
    };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const getLeaveTypeLabel = (type?: string) => {
    if (!type) return "";
    const labels = {
      annual: "عادية",
      emergency: "عارضة",
      sick: "مرضية",
      unpaid: "بدون راتب"
    };
    return labels[type as keyof typeof labels] || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">📋 نظام الحضور والانصراف</h1>
          <p className="text-gray-600 mt-1">إدارة متكاملة للحضور والإجازات</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("daily")}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              viewMode === "daily"
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            📅 السجل اليومي
          </button>
          <button
            onClick={() => setViewMode("monthly")}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              viewMode === "monthly"
                ? "bg-purple-600 text-white shadow-lg"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            📊 السجل الشهري
          </button>
        </div>
      </div>

      {viewMode === "daily" ? (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700">التاريخ:</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {isAdmin && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingRecord(null);
                      setShowEditModal(true);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    ➕ إضافة سجل
                  </button>
                  <button
                    onClick={handleConfirmDay}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    ✔️ تأكيد اليوم
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">الموظف</th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">الحالة</th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">وقت الحضور</th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">وقت الانصراف</th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">ساعات العمل</th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">الوقت الإضافي</th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">التأخير</th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">نوع الإجازة</th>
                    {isAdmin && <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">الإجراءات</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {employees.map((emp) => {
                    const record = dailyRecords.find(r => r.employeeId === emp.id);
                    return (
                      <tr key={emp.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-800">{emp.name}</p>
                            <p className="text-sm text-gray-500">{emp.position}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {record ? getStatusBadge(record.status) : <span className="text-gray-400">لم يسجل</span>}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {record?.checkIn ? new Date(record.checkIn).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {record?.checkOut ? new Date(record.checkOut).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                        </td>
                        <td className="px-6 py-4 text-gray-600">{record?.workHours || 0} ساعة</td>
                        <td className="px-6 py-4 text-gray-600">{record?.overtime || 0} ساعة</td>
                        <td className="px-6 py-4">
                          {record?.lateMinutes > 0 ? (
                            <span className="text-yellow-600 font-medium">{record.lateMinutes} دقيقة</span>
                          ) : record ? (
                            <span className="text-green-600">✓</span>
                          ) : (
                            <span className="text-gray-400">--</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {record?.leaveType ? getLeaveTypeLabel(record.leaveType) : "--"}
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-4">
                            <button
                              onClick={() => {
                                setEditingRecord(record || { employeeId: emp.id, date: selectedDate });
                                setShowEditModal(true);
                              }}
                              className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm"
                            >
                              {record ? "✏️ تعديل" : "➕ إضافة"}
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الشهر</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(selectedYear, i).toLocaleDateString("ar-EG", { month: "long" })}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">السنة</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() - 2 + i;
                    return <option key={year} value={year}>{year}</option>;
                  })}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">
                📊 التقرير الشهري - {new Date(selectedYear, selectedMonth - 1).toLocaleDateString("ar-EG", { month: "long", year: "numeric" })}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">الموظف</th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">أيام الحضور</th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">إجازات عادية</th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">إجازات عارضة</th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">أيام الغياب</th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">عطلات رسمية</th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">مرات التأخير</th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">إجمالي ساعات العمل</th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">الوقت الإضافي</th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">رصيد عادي متبقي</th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">رصيد عارض متبقي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {monthlyReport.map((report) => (
                    <tr key={report.employeeId} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-800">{report.employeeName}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                          {report.presentDays} يوم
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                          {report.annualLeaveDays} يوم
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                          {report.emergencyLeaveDays} يوم
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                          {report.absentDays} يوم
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                          {report.officialHolidayDays} يوم
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                          {report.lateDays} مرة
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 font-medium">{report.totalWorkHours} ساعة</td>
                      <td className="px-6 py-4 text-gray-600 font-medium">{report.totalOvertime} ساعة</td>
                      <td className="px-6 py-4 text-blue-600 font-bold">{report.remainingAnnualLeave} يوم</td>
                      <td className="px-6 py-4 text-orange-600 font-bold">{report.remainingEmergencyLeave} يوم</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="تسجيل الحضور" size="lg">
        <form onSubmit={handleSaveRecord} className="space-y-4">
          <input type="hidden" name="employeeId" value={editingRecord?.employeeId} />
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">التاريخ</label>
              <input
                type="date"
                name="date"
                defaultValue={editingRecord?.date || selectedDate}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الحالة</label>
              <select
                name="status"
                defaultValue={editingRecord?.status || "present"}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="present">✅ حاضر</option>
                <option value="late">⏰ متأخر</option>
                <option value="absent">❌ غائب</option>
                <option value="leave">🌴 إجازة</option>
                <option value="official_holiday">🎉 عطلة رسمية</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">وقت الحضور</label>
              <input
                type="time"
                name="checkIn"
                defaultValue={editingRecord?.checkIn ? new Date(editingRecord.checkIn).toTimeString().slice(0, 5) : ""}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">وقت الانصراف</label>
              <input
                type="time"
                name="checkOut"
                defaultValue={editingRecord?.checkOut ? new Date(editingRecord.checkOut).toTimeString().slice(0, 5) : ""}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">دقائق التأخير</label>
              <input
                type="number"
                name="lateMinutes"
                defaultValue={editingRecord?.lateMinutes || 0}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الوقت الإضافي (ساعات)</label>
              <input
                type="number"
                name="overtime"
                defaultValue={editingRecord?.overtime || 0}
                min="0"
                step="0.5"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">نوع الإجازة</label>
              <select
                name="leaveType"
                defaultValue={editingRecord?.leaveType || ""}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- اختر --</option>
                <option value="annual">عادية (21 يوم)</option>
                <option value="emergency">عارضة (7 أيام)</option>
                <option value="sick">مرضية</option>
                <option value="unpaid">بدون راتب</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ملاحظات</label>
            <textarea
              name="notes"
              defaultValue={editingRecord?.notes || ""}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="أي ملاحظات إضافية..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium">
              💾 حفظ
            </button>
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 font-medium"
            >
              ✖️ إلغاء
            </button>
          </div>
        </form>
      </Modal>

      <Toast
        message={toast.message}
        type={toast.type}
        isOpen={toast.isOpen}
        onClose={() => setToast({ ...toast, isOpen: false })}
      />
    </div>
  );
};

export default AttendanceSystem;
