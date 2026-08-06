import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useDataStore } from "../store/dataStore";
import { usePermissions } from '../hooks/usePermissions';
import { Card, Button, Table } from '../components/ui';
import ConfirmDialog from '../components/ConfirmDialog';
import { toast } from '../store/toastStore';
import { financialReportApi, FinancialReportSend } from '../services/financialReport';
import ProgressMetricCard from '../components/metric/ProgressMetricCard';
import {
  FileBarChart,
  Lock,
  Settings,
  FileText,
  Filter,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Building2,
  Wallet,
  AlertCircle,
  Send,
  CheckCircle2
} from 'lucide-react';

type Currency = "EGP" | "SAR" | "USD" | "AED";

const Reports: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { revenues, expenses, payrolls, employees, departments } = useDataStore();
  const { canRead } = usePermissions();

  const canViewReports = canRead('reports');
  const isManager = ['dev', 'general_manager', 'administrative_manager'].includes(user?.role || '');
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | "all">("all");
  const [sending, setSending] = useState(false);
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [lastSends, setLastSends] = useState<FinancialReportSend[]>([]);

  const loadSends = useCallback(async () => {
    try { setLastSends(await financialReportApi.recent(selectedMonth, selectedYear)); } catch { /* ignore */ }
  }, [selectedMonth, selectedYear]);
  useEffect(() => { loadSends(); }, [loadSends]);

  const getCurrencySymbol = (currency: Currency) => {
    const symbols = { EGP: "ج.م", SAR: "ر.س", USD: "$", AED: "د.إ" };
    return symbols[currency];
  };

  const getCurrencyName = (currency: Currency) => {
    const names = { EGP: "جنيه مصري", SAR: "ريال سعودي", USD: "دولار أمريكي", AED: "درهم إماراتي" };
    return names[currency];
  };

  const getCurrencyFlag = (currency: Currency) => {
    const flags: Record<Currency, string> = {
      EGP: "🇪🇬",
      SAR: "🇸🇦",
      USD: "🇺🇸",
      AED: "🇦🇪"
    };
    return flags[currency];
  };

  const filterByPeriod = (data: any[], dateField: string) => {
    return data.filter((item) => {
      if (!item[dateField]) return false;
      const itemDate = new Date(item[dateField]);
      if (isNaN(itemDate.getTime())) return false;

      if (selectedPeriod === "month") {
        return itemDate.getMonth() + 1 === selectedMonth && itemDate.getFullYear() === selectedYear;
      } else if (selectedPeriod === "year") {
        return itemDate.getFullYear() === selectedYear;
      }
      return true;
    });
  };

  const filteredRevenues = filterByPeriod(revenues, "date");
  const filteredExpenses = filterByPeriod(expenses, "date");
  const filteredPayrolls = filterByPeriod(payrolls, "createdAt");

  const calculateByCurrency = (currency: Currency) => {
    const currRevenues = filteredRevenues.filter(r => r.currency === currency);
    const currExpenses = filteredExpenses.filter(e => e.currency === currency);
    const currOperationalExpenses = currExpenses.filter(e => e.type === "operational" || !e.type);
    const currCapitalExpenses = currExpenses.filter(e => e.type === "capital");

    const totalRevenue = currRevenues.reduce((sum, r) => sum + (r.amount || 0), 0);
    const totalExpense = currExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const operationalExpense = currOperationalExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const capitalExpense = currCapitalExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const netProfit = totalRevenue - operationalExpense;

    return {
      totalRevenue,
      totalExpense,
      operationalExpense,
      capitalExpense,
      netProfit,
      revenueCount: currRevenues.length,
      expenseCount: currExpenses.length,
    };
  };

  const currencies: Currency[] = ["EGP", "SAR", "USD", "AED"];

  // ملخّص مختصر للإشعار (صافي الربح لكل عملة فيها حركة)
  const buildSummary = () => {
    const parts: string[] = [];
    for (const c of currencies) {
      const d = calculateByCurrency(c);
      if (d.totalRevenue || d.totalExpense) parts.push(`${getCurrencySymbol(c)} صافي ${Math.round(d.netProfit).toLocaleString()}`);
    }
    return parts.join(' · ');
  };

  const handleSend = async () => {
    setShowSendConfirm(false);
    setSending(true);
    try {
      await financialReportApi.send({ month: selectedMonth, year: selectedYear, summary: buildSummary() });
      toast('تم إرسال التقرير للمدير الإداري والمدير العام ✅', 'success');
      loadSends();
    } catch (e: any) {
      toast(e?.response?.data?.message || 'تعذّر إرسال التقرير', 'error');
    } finally { setSending(false); }
  };

  const monthLabel = new Date(selectedYear, selectedMonth - 1).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });

  // سلسلتان يوميّتان (إيرادات/مصروفات بالجنيه) للرسم التفاعلي — تُحسب دائمًا (rules of hooks)
  const dailyEgpSeries = useMemo(() => {
    const days = new Date(selectedYear, selectedMonth, 0).getDate();
    const rev: { date: string; value: number }[] = [];
    const exp: { date: string; value: number }[] = [];
    for (let d = 1; d <= days; d++) {
      rev.push({ date: String(d), value: filteredRevenues.filter((r) => r.currency === 'EGP' && new Date(r.date).getDate() === d).reduce((s, r) => s + (r.amount || 0), 0) });
      exp.push({ date: String(d), value: filteredExpenses.filter((e) => e.currency === 'EGP' && e.type !== 'refund' && new Date(e.date).getDate() === d).reduce((s, e) => s + (e.amount || 0), 0) });
    }
    return [
      { name: 'الإيرادات', accent: 'emerald' as const, data: rev },
      { name: 'المصروفات', accent: 'rose' as const, data: exp },
    ];
  }, [filteredRevenues, filteredExpenses, selectedMonth, selectedYear]);

  const periodText = selectedPeriod === "month"
    ? new Date(selectedYear, selectedMonth - 1).toLocaleDateString("ar-EG", { month: "long", year: "numeric" })
    : `سنة ${selectedYear}`;

  const generatePDF = () => {
    const displayCurrencies = selectedCurrency === "all" ? currencies : [selectedCurrency as Currency];

    const htmlContent = `
      <div class="header">
        <h1>📊 التقرير المالي الشامل</h1>
        <p>الفترة: ${periodText}</p>
        <p>تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}</p>
      </div>

      ${displayCurrencies.map(currency => {
        const data = calculateByCurrency(currency);
        const profitMargin = data.totalRevenue > 0 ? Math.round((data.netProfit / data.totalRevenue) * 100) : 0;
        const opExpensePercent = data.totalRevenue > 0 ? Math.round((data.operationalExpense / data.totalRevenue) * 100) : 0;
        if (!data.totalRevenue && !data.totalExpense) return ''; // نتخطّى العملات بدون حركة

        const sym = getCurrencySymbol(currency);
        const curRevs = filteredRevenues.filter((r: any) => r.currency === currency);
        const curExps = filteredExpenses.filter((e: any) => e.currency === currency);

        // تفصيل يومي (الأيام اللي فيها حركة)
        const daysInM = new Date(selectedYear, selectedMonth, 0).getDate();
        let dailyRows = '';
        for (let d = 1; d <= daysInM; d++) {
          const rev = curRevs.filter((r: any) => new Date(r.date).getDate() === d).reduce((s: number, r: any) => s + (r.amount || 0), 0);
          const exp = curExps.filter((e: any) => new Date(e.date).getDate() === d && e.type !== 'refund').reduce((s: number, e: any) => s + (e.amount || 0), 0);
          if (rev || exp) dailyRows += `<tr><td>${d}</td><td style="color:#059669">${rev.toLocaleString()}</td><td style="color:#ea580c">${exp.toLocaleString()}</td><td style="font-weight:bold;color:${rev - exp >= 0 ? '#059669' : '#dc2626'}">${(rev - exp).toLocaleString()}</td></tr>`;
        }

        // كل العمليات بالتفصيل
        const txRows = [
          ...curRevs.map((r: any) => ({ date: r.date, kind: 'إيراد', desc: r.title || r.category || '', amount: r.amount || 0, color: '#059669' })),
          ...curExps.map((e: any) => ({ date: e.date, kind: e.type === 'refund' ? 'مرتجع' : 'مصروف', desc: e.title || e.category || e.description || '', amount: e.amount || 0, color: '#dc2626' })),
        ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .map((t) => `<tr><td>${new Date(t.date).toLocaleDateString('ar-EG')}</td><td>${t.kind}</td><td>${t.desc}</td><td style="color:${t.color};font-weight:bold">${t.amount.toLocaleString()} ${sym}</td></tr>`).join('');

        return `
          <div style="margin: 30px 0; page-break-inside: avoid;">
            <h2 style="color: #1e40af; margin-bottom: 20px; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
              ${getCurrencyName(currency)} (${getCurrencySymbol(currency)})
            </h2>
            <table>
              <thead>
                <tr>
                  <th>البيان</th>
                  <th>القيمة</th>
                  <th>النسبة</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>إجمالي الإيرادات</td>
                  <td style="color: #059669; font-weight: bold;">${data.totalRevenue.toLocaleString()} ${getCurrencySymbol(currency)}</td>
                  <td>100%</td>
                </tr>
                <tr>
                  <td>المصروفات التشغيلية</td>
                  <td style="color: #ea580c;">-${data.operationalExpense.toLocaleString()} ${getCurrencySymbol(currency)}</td>
                  <td>${opExpensePercent}%</td>
                </tr>
                <tr style="background: #dbeafe;">
                  <td><strong>صافي الربح</strong></td>
                  <td style="color: ${data.netProfit >= 0 ? '#059669' : '#dc2626'}; font-weight: bold; font-size: 1.2em;">
                    ${data.netProfit.toLocaleString()} ${getCurrencySymbol(currency)}
                  </td>
                  <td><strong>${profitMargin}%</strong></td>
                </tr>
                <tr>
                  <td>المصروفات التأسيسية (متراكمة)</td>
                  <td style="color: #9333ea;">${data.capitalExpense.toLocaleString()} ${getCurrencySymbol(currency)}</td>
                  <td style="font-size: 0.8em;">لا تُخصم</td>
                </tr>
                <tr>
                  <td>عدد الإيرادات</td>
                  <td colspan="2">${data.revenueCount}</td>
                </tr>
                <tr>
                  <td>عدد المصروفات</td>
                  <td colspan="2">${data.expenseCount}</td>
                </tr>
              </tbody>
            </table>

            ${dailyRows ? `
            <h3 style="color:#1e40af;margin:20px 0 10px;">التفصيل اليومي</h3>
            <table>
              <thead><tr><th>اليوم</th><th>الإيرادات</th><th>المصروفات</th><th>الصافي</th></tr></thead>
              <tbody>${dailyRows}</tbody>
            </table>` : ''}

            ${txRows ? `
            <h3 style="color:#1e40af;margin:20px 0 10px;">كل العمليات (${curRevs.length + curExps.length})</h3>
            <table>
              <thead><tr><th>التاريخ</th><th>النوع</th><th>البيان</th><th>المبلغ</th></tr></thead>
              <tbody>${txRows}</tbody>
            </table>` : ''}
          </div>
        `;
      }).join('')}

      <div style="margin: 30px 0;">
        <h2 style="color: #1e40af; margin-bottom: 20px;">معلومات الشركة</h2>
        <table>
          <tbody>
            <tr>
              <td>إجمالي الموظفين</td>
              <td><strong>${employees.length}</strong></td>
            </tr>
            <tr>
              <td>الموظفين النشطين</td>
              <td><strong>${employees.filter(e => e.isActive).length}</strong></td>
            </tr>
            <tr>
              <td>عدد الأقسام</td>
              <td><strong>${departments.length}</strong></td>
            </tr>
            <tr>
              <td>إجمالي الرواتب المدفوعة</td>
              <td><strong>${filteredPayrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0).toLocaleString()} ر.س</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="background: #fef3c7; border: 1px solid #fbbf24; padding: 15px; border-radius: 8px; margin-top: 30px;">
        <p style="margin: 0; color: #92400e;"><strong>ملاحظة:</strong> صافي الربح = الإيرادات - المصروفات التشغيلية فقط. المصروفات التأسيسية (متراكمة من بداية الشركة) لا تُخصم من صافي الربح.</p>
      </div>
    `;

    const previewWindow = window.open('', '_blank');
    if (previewWindow) {
      previewWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <title>التقرير المالي - ${periodText}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; padding: 20px; background: #f5f5f5; }
            .container { max-width: 1000px; margin: 0 auto; background: white; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #3b82f6; }
            .header h1 { color: #1e40af; margin: 0 0 10px 0; font-size: 28px; }
            .header p { color: #6b7280; margin: 5px 0; font-size: 14px; }
            h2 { color: #1e40af; margin: 20px 0 15px 0; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 12px; text-align: right; border: 1px solid #e5e7eb; }
            th { background: #3b82f6; color: white; font-weight: bold; }
            tr:nth-child(even) { background: #f9fafb; }
            .actions { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; }
            .btn { padding: 12px 30px; margin: 0 10px; border: none; border-radius: 6px; font-size: 16px; cursor: pointer; font-weight: bold; }
            .btn-print { background: #3b82f6; color: white; }
            .btn-print:hover { background: #2563eb; }
            .btn-close { background: #6b7280; color: white; }
            .btn-close:hover { background: #4b5563; }
            @media print { .actions { display: none; } body { background: white; padding: 0; } .container { box-shadow: none; padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="container">
            ${htmlContent}
            <div class="actions">
              <button class="btn btn-print" onclick="window.print()">🖨️ طباعة / حفظ PDF</button>
              <button class="btn btn-close" onclick="window.close()">❌ إغلاق</button>
            </div>
          </div>
        </body>
        </html>
      `);
      previewWindow.document.close();
    }
  };

  const displayCurrencies = selectedCurrency === "all" ? currencies : [selectedCurrency as Currency];

  // Permission Guard
  if (!canViewReports) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-error-100 dark:bg-error-900/30 rounded-full flex items-center justify-center">
            <Lock className="w-10 h-10 text-error-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">ليس لديك صلاحية</h2>
          <p className="text-gray-600 dark:text-gray-400">لا يمكنك الوصول إلى التقارير</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-100 dark:bg-brand-900/30 rounded-xl flex items-center justify-center">
              <FileBarChart className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            التقارير المالية الشاملة
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">تقارير مفصلة لكل عملة على حدة</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {isManager && (
            <Button
              variant="outline"
              onClick={() => navigate('/report-settings')}
            >
              <Settings className="w-4 h-4" />
              إعدادات التقارير اليومية
            </Button>
          )}
          <Button variant="outline" onClick={generatePDF}>
            <FileText className="w-4 h-4" />
            تصدير PDF
          </Button>
          <Button onClick={() => setShowSendConfirm(true)} disabled={sending}>
            <Send className="w-4 h-4" />
            {sending ? 'جاري الإرسال...' : 'إرسال التقرير للمدراء'}
          </Button>
        </div>
      </div>

      {/* حالة آخر إرسال للشهر المحدد */}
      {lastSends.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="text-emerald-800 dark:text-emerald-300">
            اتبعت تقارير {monthLabel} للمدراء — آخر إرسال بواسطة <b>{lastSends[0].sentByName}</b> ({new Date(lastSends[0].createdAt).toLocaleString('ar-EG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })})
          </span>
        </div>
      )}

      <ConfirmDialog
        isOpen={showSendConfirm}
        onClose={() => setShowSendConfirm(false)}
        onConfirm={handleSend}
        type="info"
        title="إرسال التقرير المالي"
        message={`هيتبعت تقرير ${monthLabel} للمدير الإداري (حسين) والمدير العام (يوسف) مع إشعار. متأكد إن التقرير خلص وجاهز؟`}
        confirmText="تأكيد وإرسال"
      />

      {/* Filters */}
      <Card>
        <Card.Header>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
            <Filter className="w-5 h-5 text-brand-500" />
            الفلاتر
          </h2>
        </Card.Header>
        <Card.Body>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الفترة</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                <option value="month">شهري</option>
                <option value="year">سنوي</option>
              </select>
            </div>

            {selectedPeriod === "month" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الشهر</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(selectedYear, i).toLocaleDateString("ar-EG", { month: "long" })}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">السنة</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                {Array.from({ length: 10 }, (_, i) => 2024 + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">العملة</label>
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value as Currency | "all")}
                className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                <option value="all">جميع العملات</option>
                <option value="EGP">🇪🇬 جنيه مصري</option>
                <option value="SAR">🇸🇦 ريال سعودي</option>
                <option value="USD">🇺🇸 دولار أمريكي</option>
                <option value="AED">🇦🇪 درهم إماراتي</option>
              </select>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* الرسم اليومي التفاعلي (شهري فقط، بالجنيه) */}
      {selectedPeriod === 'month' && (
        <ProgressMetricCard
          title={`الإيرادات والمصروفات اليومية — ${monthLabel} (ج.م)`}
          unit="ج.م"
          defaultView="curve"
          size="lg"
          period="كل الشهر"
          periodOptions={[{ label: 'كل الشهر' }, { label: 'آخر 14 يوم', points: 14 }, { label: 'آخر 7 أيام', points: 7 }]}
          dateFormatter={(d) => `يوم ${d}`}
          series={dailyEgpSeries}
        />
      )}

      {/* Currency Reports */}
      <div className="space-y-6">
        {displayCurrencies.map(currency => {
          const data = calculateByCurrency(currency);
          const profitMargin = data.totalRevenue > 0 ? Math.round((data.netProfit / data.totalRevenue) * 100) : 0;
          const opExpensePercent = data.totalRevenue > 0 ? Math.round((data.operationalExpense / data.totalRevenue) * 100) : 0;

          return (
            <Card key={currency}>
              <Card.Header>
                <div className="flex items-center justify-between w-full">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <span className="text-2xl">{getCurrencyFlag(currency)}</span>
                    {getCurrencyName(currency)}
                  </h2>
                  <span className="text-2xl font-bold text-gray-500 dark:text-gray-400">{getCurrencySymbol(currency)}</span>
                </div>
              </Card.Header>
              <Card.Body>
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-success-50 dark:bg-success-900/20 rounded-xl p-4 border-r-4 border-success-500">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-5 h-5 text-success-600 dark:text-success-400" />
                      <p className="text-success-600 dark:text-success-400 text-sm font-medium">إجمالي الإيرادات</p>
                    </div>
                    <p className="text-2xl font-bold text-success-700 dark:text-success-300">{data.totalRevenue.toLocaleString()}</p>
                    <p className="text-xs text-success-600 dark:text-success-400 mt-1">{data.revenueCount} إيراد</p>
                  </div>

                  <div className="bg-warning-50 dark:bg-warning-900/20 rounded-xl p-4 border-r-4 border-warning-500">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown className="w-5 h-5 text-warning-600 dark:text-warning-400" />
                      <p className="text-warning-600 dark:text-warning-400 text-sm font-medium">مصروفات تشغيلية</p>
                    </div>
                    <p className="text-2xl font-bold text-warning-700 dark:text-warning-300">{data.operationalExpense.toLocaleString()}</p>
                    <p className="text-xs text-warning-600 dark:text-warning-400 mt-1">تُخصم من الربح</p>
                  </div>

                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border-r-4 border-purple-500">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      <p className="text-purple-600 dark:text-purple-400 text-sm font-medium">مصروفات رأسمالية</p>
                    </div>
                    <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{data.capitalExpense.toLocaleString()}</p>
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">لا تُخصم من الربح</p>
                  </div>

                  <div className={`${data.netProfit >= 0 ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-500' : 'bg-error-50 dark:bg-error-900/20 border-error-500'} rounded-xl p-4 border-r-4`}>
                    <div className="flex items-center gap-2 mb-2">
                      {data.netProfit >= 0 ? (
                        <TrendingUp className={`w-5 h-5 ${data.netProfit >= 0 ? 'text-brand-600 dark:text-brand-400' : 'text-error-600 dark:text-error-400'}`} />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-error-600 dark:text-error-400" />
                      )}
                      <p className={`${data.netProfit >= 0 ? 'text-brand-600 dark:text-brand-400' : 'text-error-600 dark:text-error-400'} text-sm font-medium`}>
                        صافي الربح
                      </p>
                    </div>
                    <p className={`text-2xl font-bold ${data.netProfit >= 0 ? 'text-brand-700 dark:text-brand-300' : 'text-error-700 dark:text-error-300'}`}>
                      {data.netProfit.toLocaleString()}
                    </p>
                    <p className={`text-xs ${data.netProfit >= 0 ? 'text-brand-600 dark:text-brand-400' : 'text-error-600 dark:text-error-400'} mt-1`}>
                      {profitMargin}% هامش ربح
                    </p>
                  </div>
                </div>

                {/* Detailed Table */}
                <div className="overflow-x-auto">
                  <Table>
                    <Table.Header>
                      <Table.Row>
                        <Table.Head>البيان</Table.Head>
                        <Table.Head>القيمة</Table.Head>
                        <Table.Head>النسبة</Table.Head>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      <Table.Row>
                        <Table.Cell>
                          <span className="font-medium text-gray-800 dark:text-white">إجمالي الإيرادات</span>
                        </Table.Cell>
                        <Table.Cell>
                          <span className="font-bold text-success-600 dark:text-success-400">
                            {data.totalRevenue.toLocaleString()} {getCurrencySymbol(currency)}
                          </span>
                        </Table.Cell>
                        <Table.Cell>
                          <span className="text-gray-600 dark:text-gray-400">100%</span>
                        </Table.Cell>
                      </Table.Row>
                      <Table.Row>
                        <Table.Cell>
                          <span className="font-medium text-gray-800 dark:text-white">المصروفات التشغيلية</span>
                        </Table.Cell>
                        <Table.Cell>
                          <span className="font-bold text-warning-600 dark:text-warning-400">
                            -{data.operationalExpense.toLocaleString()} {getCurrencySymbol(currency)}
                          </span>
                        </Table.Cell>
                        <Table.Cell>
                          <span className="text-gray-600 dark:text-gray-400">{opExpensePercent}%</span>
                        </Table.Cell>
                      </Table.Row>
                      <Table.Row className="bg-brand-50 dark:bg-brand-900/20">
                        <Table.Cell>
                          <span className="font-bold text-gray-800 dark:text-white">صافي الربح</span>
                        </Table.Cell>
                        <Table.Cell>
                          <span className={`font-bold text-xl ${data.netProfit >= 0 ? 'text-brand-600 dark:text-brand-400' : 'text-error-600 dark:text-error-400'}`}>
                            {data.netProfit.toLocaleString()} {getCurrencySymbol(currency)}
                          </span>
                        </Table.Cell>
                        <Table.Cell>
                          <span className="font-bold text-gray-800 dark:text-white">{profitMargin}%</span>
                        </Table.Cell>
                      </Table.Row>
                      <Table.Row>
                        <Table.Cell>
                          <span className="font-medium text-gray-800 dark:text-white">المصروفات الرأسمالية</span>
                        </Table.Cell>
                        <Table.Cell>
                          <span className="font-bold text-purple-600 dark:text-purple-400">
                            {data.capitalExpense.toLocaleString()} {getCurrencySymbol(currency)}
                          </span>
                        </Table.Cell>
                        <Table.Cell>
                          <span className="text-xs text-gray-500 dark:text-gray-500">لا تُخصم</span>
                        </Table.Cell>
                      </Table.Row>
                    </Table.Body>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          );
        })}
      </div>

      {/* Company Overview */}
      <Card>
        <Card.Header>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-brand-500" />
            معلومات الشركة - {periodText}
          </h3>
        </Card.Header>
        <Card.Body>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center bg-brand-50 dark:bg-brand-900/20 rounded-xl p-6">
              <div className="w-12 h-12 mx-auto mb-3 bg-brand-100 dark:bg-brand-800/50 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-brand-600 dark:text-brand-400" />
              </div>
              <div className="text-3xl font-bold text-brand-600 dark:text-brand-400 mb-1">{employees.length}</div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">إجمالي الموظفين</p>
            </div>
            <div className="text-center bg-success-50 dark:bg-success-900/20 rounded-xl p-6">
              <div className="w-12 h-12 mx-auto mb-3 bg-success-100 dark:bg-success-800/50 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-success-600 dark:text-success-400" />
              </div>
              <div className="text-3xl font-bold text-success-600 dark:text-success-400 mb-1">
                {employees.filter(e => e.isActive).length}
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">الموظفين النشطين</p>
            </div>
            <div className="text-center bg-purple-50 dark:bg-purple-900/20 rounded-xl p-6">
              <div className="w-12 h-12 mx-auto mb-3 bg-purple-100 dark:bg-purple-800/50 rounded-full flex items-center justify-center">
                <Building2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-1">{departments.length}</div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">عدد الأقسام</p>
            </div>
            <div className="text-center bg-warning-50 dark:bg-warning-900/20 rounded-xl p-6">
              <div className="w-12 h-12 mx-auto mb-3 bg-warning-100 dark:bg-warning-800/50 rounded-full flex items-center justify-center">
                <Wallet className="w-6 h-6 text-warning-600 dark:text-warning-400" />
              </div>
              <div className="text-2xl font-bold text-warning-600 dark:text-warning-400 mb-1">
                {filteredPayrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0).toLocaleString()}
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">إجمالي الرواتب (ر.س)</p>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Note */}
      <div className="bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-warning-100 dark:bg-warning-800/50 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-warning-600 dark:text-warning-400" />
          </div>
          <div>
            <p className="text-warning-800 dark:text-warning-200 font-semibold mb-1">ملاحظة مهمة</p>
            <ul className="text-warning-700 dark:text-warning-300 text-sm space-y-1">
              <li>• صافي الربح = الإيرادات - المصروفات التشغيلية فقط</li>
              <li>• المصروفات الرأسمالية لا تُخصم من صافي الربح</li>
              <li>• كل عملة محسوبة بشكل منفصل تماماً</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
