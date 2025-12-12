import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import Toast from '../components/Toast';

const ReportSettings: React.FC = () => {
  const { user } = useAuthStore();
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [testingEmail, setTestingEmail] = useState<string | null>(null);
  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' as any, isOpen: false });

  const isManager = ['super_admin', 'general_manager', 'administrative_manager'].includes(user?.role || '');

  useEffect(() => {
    if (isManager) {
      loadSettings();
      loadLogs();
    }
  }, []);

  const loadSettings = async () => {
    try {
      const response = await api.get('/report-settings');
      setSettings(response.data);
      setSenderName(response.data.senderName || 'نظام جماوي');
      setSenderEmail(response.data.senderEmail || '');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      const response = await api.get('/report-settings/logs');
      setLogs(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const toggleEnabled = async () => {
    try {
      await api.put('/report-settings/toggle', { enabled: !settings.enabled });
      setToast({ 
        message: !settings.enabled ? 'تم تفعيل التقارير اليومية' : 'تم إيقاف التقارير اليومية', 
        type: 'success', 
        isOpen: true 
      });
      loadSettings();
    } catch (error: any) {
      setToast({ message: error.response?.data?.message || 'فشل التحديث', type: 'error', isOpen: true });
    }
  };

  const updateSendTime = async (time: string) => {
    try {
      await api.put('/report-settings/send-time', { sendTime: time });
      setToast({ message: 'تم تحديث موعد الإرسال', type: 'success', isOpen: true });
      loadSettings();
    } catch (error: any) {
      setToast({ message: error.response?.data?.message || 'فشل التحديث', type: 'error', isOpen: true });
    }
  };

  const toggleRecipient = async (index: number) => {
    try {
      const updatedRecipients = [...settings.recipients];
      updatedRecipients[index].enabled = !updatedRecipients[index].enabled;
      
      await api.put('/report-settings/recipients', { recipients: updatedRecipients });
      setToast({ message: 'تم تحديث المستلمين', type: 'success', isOpen: true });
      loadSettings();
    } catch (error: any) {
      setToast({ message: error.response?.data?.message || 'فشل التحديث', type: 'error', isOpen: true });
    }
  };

  const toggleSection = async (section: string) => {
    try {
      const updatedSections = { ...settings.reportSections, [section]: !settings.reportSections[section] };
      await api.put('/report-settings/sections', { reportSections: updatedSections });
      setToast({ message: 'تم تحديث أقسام التقرير', type: 'success', isOpen: true });
      loadSettings();
    } catch (error: any) {
      setToast({ message: error.response?.data?.message || 'فشل التحديث', type: 'error', isOpen: true });
    }
  };

  const sendTestReport = async () => {
    try {
      await api.post('/report-settings/test');
      setToast({ message: 'تم إرسال تقرير تجريبي إلى بريدك الإلكتروني', type: 'success', isOpen: true });
    } catch (error: any) {
      setToast({ message: error.response?.data?.message || 'فشل الإرسال', type: 'error', isOpen: true });
    }
  };

  const sendNowReport = async () => {
    try {
      await api.post('/report-settings/send-now');
      setToast({ message: 'تم إرسال التقارير لجميع المستلمين المفعلين', type: 'success', isOpen: true });
      loadSettings();
      loadLogs();
    } catch (error: any) {
      setToast({ message: error.response?.data?.message || 'فشل الإرسال', type: 'error', isOpen: true });
    }
  };

  const testRecipientEmail = async (email: string, name: string) => {
    setTestingEmail(email);
    try {
      await api.post('/report-settings/test-recipient', { email, name });
      setToast({ message: `تم إرسال تقرير تجريبي إلى ${email}`, type: 'success', isOpen: true });
      loadLogs();
    } catch (error: any) {
      setToast({ message: error.response?.data?.message || 'فشل الإرسال', type: 'error', isOpen: true });
    } finally {
      setTestingEmail(null);
    }
  };

  const updateSenderInfo = async () => {
    try {
      await api.put('/report-settings/sender', { senderName, senderEmail });
      setToast({ message: 'تم تحديث معلومات المرسل', type: 'success', isOpen: true });
      loadSettings();
    } catch (error: any) {
      setToast({ message: error.response?.data?.message || 'فشل التحديث', type: 'error', isOpen: true });
    }
  };

  const updateReportFormat = async (format: string) => {
    try {
      await api.put('/report-settings/format', { reportFormat: format });
      setToast({ message: 'تم تحديث صيغة التقرير', type: 'success', isOpen: true });
      loadSettings();
    } catch (error: any) {
      setToast({ message: error.response?.data?.message || 'فشل التحديث', type: 'error', isOpen: true });
    }
  };

  if (!isManager) {
    return (
      <div className="text-center py-12">
        <p className="text-xl text-gray-600">ليس لديك صلاحية للوصول لهذه الصفحة</p>
        <p className="text-gray-500 mt-2">هذه الصفحة متاحة فقط للمدير العام والمدير الإداري</p>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-12"><p className="text-xl text-gray-600">جاري التحميل...</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">⚙️ إعدادات التقارير اليومية</h1>
          <p className="text-gray-600 mt-1">تحكم في التقارير والإشعارات اليومية</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={sendTestReport}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            📧 إرسال تقرير تجريبي
          </button>
          <button
            onClick={sendNowReport}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            ⚡ إرسال فوري للجميع
          </button>
        </div>
      </div>

      {/* حالة التقارير */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">🔔 حالة التقارير</h2>
            <p className="text-gray-600 mt-1">
              {settings?.enabled ? 'التقارير مفعلة ويتم إرسالها تلقائياً' : 'التقارير متوقفة حالياً'}
            </p>
          </div>
          <button
            onClick={toggleEnabled}
            className={`px-8 py-3 rounded-lg font-bold text-white transition-all ${
              settings?.enabled 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {settings?.enabled ? '⏸️ إيقاف' : '▶️ تفعيل'}
          </button>
        </div>
      </div>

      {/* إعدادات المرسل */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h2 className="text-xl font-bold text-gray-800 mb-4">📧 إعدادات المرسل</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-gray-700 font-medium min-w-[100px]">إيميل الإرسال:</label>
            <input
              type="text"
              value="YOUR_EMAIL@smtp-SMTP_PROVIDER.com"
              disabled
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
            />
            <span className="text-xs text-green-600 font-medium">✓ SMTP_PROVIDER معتمد</span>
          </div>
          <div className="flex items-center gap-4">
            <label className="text-gray-700 font-medium min-w-[100px]">اسم المرسل:</label>
            <input
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="اسم يظهر عند المستلم"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <button
            onClick={updateSenderInfo}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            💾 حفظ اسم المرسل
          </button>
        </div>
      </div>

      {/* موعد الإرسال */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h2 className="text-xl font-bold text-gray-800 mb-4">🕐 موعد الإرسال</h2>
        <div className="flex items-center gap-4">
          <label className="text-gray-700 font-medium">الوقت:</label>
          <input
            type="time"
            value={settings?.sendTime || '18:00'}
            onChange={(e) => updateSendTime(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          />
          <span className="text-gray-600">يتم الإرسال يومياً في هذا الموعد</span>
        </div>
        {settings?.lastSentAt && (
          <p className="text-sm text-gray-500 mt-3">
            آخر إرسال: {new Date(settings.lastSentAt).toLocaleString('ar-EG')}
          </p>
        )}
      </div>

      {/* صيغة التقرير */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h2 className="text-xl font-bold text-gray-800 mb-4">📄 صيغة التقرير</h2>
        <p className="text-gray-600 mb-4">اختر كيف تريد إرسال التقارير اليومية</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { key: 'both', label: 'PDF + HTML', icon: '📎', description: 'تقرير HTML مع ملف PDF مرفق' },
            { key: 'pdf', label: 'PDF فقط', icon: '📄', description: 'ملف PDF مرفق بالرسالة' },
            { key: 'html', label: 'HTML فقط', icon: '🌐', description: 'تقرير HTML في جسم الرسالة' }
          ].map((format) => (
            <div
              key={format.key}
              onClick={() => updateReportFormat(format.key)}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                settings?.reportFormat === format.key || (!settings?.reportFormat && format.key === 'both')
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-gray-300 bg-gray-50 hover:border-gray-400'
              }`}
            >
              <div className="text-center">
                <span className="text-3xl">{format.icon}</span>
                <h3 className="font-bold text-gray-800 mt-2">{format.label}</h3>
                <p className="text-sm text-gray-600 mt-1">{format.description}</p>
                {(settings?.reportFormat === format.key || (!settings?.reportFormat && format.key === 'both')) && (
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2 py-1 bg-amber-500 text-white text-xs rounded-full">
                      ✓ مُختار
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* المستلمون */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h2 className="text-xl font-bold text-gray-800 mb-4">👥 المستلمون</h2>
        <div className="space-y-3">
          {settings?.recipients?.map((recipient: any, index: number) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${recipient.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                <div>
                  <p className="font-medium text-gray-800">{recipient.name}</p>
                  <p className="text-sm text-gray-600">{recipient.email}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => testRecipientEmail(recipient.email, recipient.name)}
                  disabled={testingEmail === recipient.email}
                  className="px-4 py-2 rounded-lg font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50"
                >
                  {testingEmail === recipient.email ? '⏳ جاري الإرسال...' : '🧪 اختبار'}
                </button>
                <button
                  onClick={() => toggleRecipient(index)}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    recipient.enabled
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {recipient.enabled ? 'إيقاف' : 'تفعيل'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* أقسام التقرير */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h2 className="text-xl font-bold text-gray-800 mb-4">📊 أقسام التقرير</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: 'attendance', label: '👥 الحضور والغياب', icon: '👥' },
            { key: 'financial', label: '💰 الملخص المالي', icon: '💰' },
            { key: 'tasks', label: '📋 المهام', icon: '📋' },
            { key: 'alerts', label: '🔔 التنبيهات', icon: '🔔' }
          ].map((section) => (
            <div
              key={section.key}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                settings?.reportSections?.[section.key]
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 bg-gray-50'
              }`}
              onClick={() => toggleSection(section.key)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{section.icon}</span>
                  <span className="font-medium text-gray-800">{section.label}</span>
                </div>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  settings?.reportSections?.[section.key]
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}>
                  {settings?.reportSections?.[section.key] ? '✓' : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* سجل الإرسال */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h2 className="text-xl font-bold text-gray-800 mb-4">📋 سجل الإرسال</h2>
        {logs.length === 0 ? (
          <p className="text-gray-500 text-center py-4">لا يوجد سجل إرسال حتى الآن</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-3 text-right">المستلم</th>
                  <th className="px-4 py-3 text-right">الإيميل</th>
                  <th className="px-4 py-3 text-right">الحالة</th>
                  <th className="px-4 py-3 text-right">النوع</th>
                  <th className="px-4 py-3 text-right">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log: any, index: number) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">{log.recipientName}</td>
                    <td className="px-4 py-3 text-gray-600">{log.recipientEmail}</td>
                    <td className="px-4 py-3">
                      {log.status === 'success' ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">✅ نجح</span>
                      ) : (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs" title={log.errorMessage}>❌ فشل</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {log.reportType === 'test' && <span className="text-blue-600">🧪 تجريبي</span>}
                      {log.reportType === 'scheduled' && <span className="text-purple-600">📅 مجدول</span>}
                      {log.reportType === 'immediate' && <span className="text-orange-600">⚡ فوري</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(log.sentAt).toLocaleString('ar-EG')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Toast message={toast.message} type={toast.type} isOpen={toast.isOpen} onClose={() => setToast({ ...toast, isOpen: false })} />
    </div>
  );
};

export default ReportSettings;
