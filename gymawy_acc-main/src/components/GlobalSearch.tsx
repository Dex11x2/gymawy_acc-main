import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataStore } from '../store/dataStore';

interface SearchResult {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  link: string;
  icon: string;
}

export const GlobalSearch: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const navigate = useNavigate();
  const { employees, departments, revenues, expenses } = useDataStore();

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchData = () => {
      const allResults: SearchResult[] = [];
      const lowerQuery = query.toLowerCase();

      // Search employees
      (employees || []).forEach((emp: any) => {
        if (emp.name.toLowerCase().includes(lowerQuery) || emp.email.toLowerCase().includes(lowerQuery)) {
          allResults.push({
            id: emp.id,
            type: 'موظف',
            title: emp.name,
            subtitle: emp.position || emp.email,
            link: `/employees`,
            icon: '👤'
          });
        }
      });

      // Search departments
      (departments || []).forEach((dept: any) => {
        if (dept.name.toLowerCase().includes(lowerQuery)) {
          allResults.push({
            id: dept.id,
            type: 'قسم',
            title: dept.name,
            subtitle: dept.description || '',
            link: `/departments`,
            icon: '🏢'
          });
        }
      });

      // Search revenues
      (revenues || []).forEach((rev: any) => {
        if (rev.description?.toLowerCase().includes(lowerQuery) || rev.customerName?.toLowerCase().includes(lowerQuery)) {
          allResults.push({
            id: rev.id,
            type: 'إيراد',
            title: rev.description || rev.customerName,
            subtitle: `${rev.amount} ${rev.currency}`,
            link: `/revenues`,
            icon: '📈'
          });
        }
      });

      // Search expenses
      (expenses || []).forEach((exp: any) => {
        if (exp.description?.toLowerCase().includes(lowerQuery)) {
          allResults.push({
            id: exp.id,
            type: 'مصروف',
            title: exp.description,
            subtitle: `${exp.amount} ${exp.currency}`,
            link: `/expenses`,
            icon: '📉'
          });
        }
      });

      setResults(allResults.slice(0, 10));
    };

    const debounce = setTimeout(searchData, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-20" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="🔍 ابحث في كل شيء..."
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 text-lg"
            autoFocus
          />
        </div>

        <div className="max-h-96 overflow-y-auto">
          {results.length === 0 && query ? (
            <div className="p-8 text-center text-gray-500">
              <div className="text-4xl mb-2">🔍</div>
              <p>لا توجد نتائج</p>
            </div>
          ) : (
            results.map((result) => (
              <div
                key={result.id}
                onClick={() => {
                  navigate(result.link);
                  onClose();
                }}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{result.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-800 dark:text-white">{result.title}</h3>
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">
                        {result.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{result.subtitle}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs text-gray-500 text-center">
          اضغط ESC للإغلاق
        </div>
      </div>
    </div>
  );
};
