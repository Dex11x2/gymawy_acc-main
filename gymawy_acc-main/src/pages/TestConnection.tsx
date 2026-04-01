import React, { useState } from 'react';
import api from '../services/api';

const TestConnection: React.FC = () => {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const testEndpoint = async (name: string, endpoint: string) => {
    try {
      const response = await api.get(endpoint);
      setResults((prev: any) => ({
        ...prev,
        [name]: { success: true, data: response.data }
      }));
    } catch (error: any) {
      setResults((prev: any) => ({
        ...prev,
        [name]: { success: false, error: error.response?.data || error.message }
      }));
    }
  };

  const runTests = async () => {
    setLoading(true);
    setResults({});
    
    await testEndpoint('Users', '/users');
    await testEndpoint('Employees', '/employees');
    await testEndpoint('Departments', '/departments');
    
    setLoading(false);
  };

  const checkToken = () => {
    const auth = localStorage.getItem('gemawi-auth');
    if (auth) {
      try {
        const parsed = JSON.parse(auth);
        return parsed.token ? '✅ Token موجود' : '❌ Token مفقود';
      } catch (e) {
        return '❌ خطأ في قراءة Token';
      }
    }
    return '❌ لا يوجد بيانات تسجيل دخول';
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">اختبار الاتصال</h1>
      
      <div className="bg-white rounded-xl p-6 shadow-lg mb-6">
        <h2 className="text-xl font-bold mb-4">حالة Token</h2>
        <p className="text-lg">{checkToken()}</p>
      </div>

      <button
        onClick={runTests}
        disabled={loading}
        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 mb-6"
      >
        {loading ? 'جاري الاختبار...' : 'اختبار الاتصال'}
      </button>

      <div className="space-y-4">
        {Object.entries(results).map(([name, result]: [string, any]) => (
          <div key={name} className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-bold mb-2">
              {result.success ? '✅' : '❌'} {name}
            </h3>
            <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
              {JSON.stringify(result.success ? result.data : result.error, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TestConnection;
