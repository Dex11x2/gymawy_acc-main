import React, { useState } from "react";
import { useAuthStore } from "../store/authStore";
import { usePermissions } from "../hooks/usePermissions";
import Dashboard from "./Dashboard";
import EmployeeDashboard from "./EmployeeDashboard";

const DashboardWrapper: React.FC = () => {
  const { user } = useAuthStore();
  const { canRead } = usePermissions();

  // المديرون يمكنهم التبديل
  const isManager =
    user?.role === "super_admin" ||
    user?.role === "general_manager" ||
    user?.role === "administrative_manager";

  // التحقق من صلاحية رؤية Dashboard الرئيسي
  const canViewMainDashboard = isManager || canRead("dashboard");

  // الموظفون يبدأون بلوحة الموظف، المديرون يبدأون باللوحة الرئيسية
  const [showEmployeeDashboard, setShowEmployeeDashboard] = useState(
    !isManager
  );

  return (
    <div className="space-y-4">
      {/* زر التبديل - يظهر فقط للمديرين أو من لديه صلاحية اللوحة الرئيسية */}
      {canViewMainDashboard && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowEmployeeDashboard(!showEmployeeDashboard)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg flex items-center gap-2 font-medium"
          >
            {showEmployeeDashboard ? (
              <>
                <span>📊</span>
                <span>اللوحة الرئيسية</span>
              </>
            ) : (
              <>
                <span>👤</span>
                <span>لوحة الموظف</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* عرض اللوحة المناسبة */}
      {showEmployeeDashboard ? (
        <EmployeeDashboard />
      ) : canViewMainDashboard ? (
        <Dashboard />
      ) : (
        <EmployeeDashboard />
      )}
    </div>
  );
};

export default DashboardWrapper;
