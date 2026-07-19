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
    user?.role === "dev" ||
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
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-2.5 font-medium text-gray-700 shadow-sm transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:text-brand-400"
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
