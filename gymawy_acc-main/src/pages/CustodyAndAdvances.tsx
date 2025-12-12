import React, { useState } from 'react';
import { usePermissions } from '../hooks/usePermissions';
import { Lock, Package, Wallet } from 'lucide-react';
import Custody from './Custody';
import Advances from './Advances';

const CustodyAndAdvances: React.FC = () => {
  const { canRead } = usePermissions();
  const canViewCustody = canRead('custody');
  const canViewAdvances = canRead('advances');

  const [activeTab, setActiveTab] = useState<'custody' | 'advances'>('custody');

  if (!canViewCustody && !canViewAdvances) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-error-100 dark:bg-error-900/30 rounded-full flex items-center justify-center">
            <Lock className="w-10 h-10 text-error-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">ليس لديك صلاحية</h2>
          <p className="text-gray-600 dark:text-gray-400">لا يمكنك الوصول إلى العهد والسلفيات</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('custody')}
          className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
            activeTab === 'custody'
              ? 'bg-brand-500 text-white shadow-lg'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
          }`}
        >
          <Package className="w-5 h-5" />
          العهد العينية
        </button>
        <button
          onClick={() => setActiveTab('advances')}
          className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
            activeTab === 'advances'
              ? 'bg-brand-500 text-white shadow-lg'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
          }`}
        >
          <Wallet className="w-5 h-5" />
          السلفيات
        </button>
      </div>

      {activeTab === 'custody' ? <Custody /> : <Advances />}
    </div>
  );
};

export default CustodyAndAdvances;
