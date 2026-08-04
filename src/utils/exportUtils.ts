import * as XLSX from 'xlsx';

/**
 * إنشاء معاينة PDF بصيغة HTML وفتحها في نافذة جديدة
 */
const createPDFPreview = (htmlContent: string) => {
  const previewWindow = window.open('', '_blank');
  if (previewWindow) {
    previewWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>معاينة التقرير</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            direction: rtl;
            padding: 20px;
            background: #f5f5f5;
          }
          .container {
            max-width: 1000px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #3b82f6;
          }
          .header h1 {
            color: #1e40af;
            margin: 0 0 10px 0;
            font-size: 28px;
          }
          .header p {
            color: #6b7280;
            margin: 5px 0;
            font-size: 14px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th, td {
            padding: 12px;
            text-align: right;
            border: 1px solid #e5e7eb;
          }
          th {
            background: #3b82f6;
            color: white;
            font-weight: bold;
          }
          tr:nth-child(even) {
            background: #f9fafb;
          }
          .total-row {
            background: #dbeafe !important;
            font-weight: bold;
            font-size: 1.1em;
          }
          .actions {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
          }
          .btn {
            padding: 12px 30px;
            margin: 0 10px;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            cursor: pointer;
            font-weight: bold;
          }
          .btn-print {
            background: #3b82f6;
            color: white;
          }
          .btn-print:hover {
            background: #2563eb;
          }
          .btn-close {
            background: #6b7280;
            color: white;
          }
          .btn-close:hover {
            background: #4b5563;
          }
          @media print {
            .actions { display: none; }
            body { background: white; padding: 0; }
            .container { box-shadow: none; padding: 20px; }
          }
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

/**
 * تصدير الإيرادات إلى PDF
 */
export const exportRevenuesToPDF = (revenues: any[], month: number, year: number) => {
  let totalEGP = 0, totalSAR = 0, totalUSD = 0;
  
  const getServiceTypeName = (type: string) => {
    switch(type) {
      case 'subscriptions': return 'اشتراكات';
      case 'sales': return 'مبيعات';
      case 'services': return 'خدمات';
      case 'other': return 'أخرى';
      default: return 'غير محدد';
    }
  };
  
  const rows = revenues.map(rev => {
    if (rev.currency === 'EGP') totalEGP += rev.amount;
    else if (rev.currency === 'SAR') totalSAR += rev.amount;
    else if (rev.currency === 'USD') totalUSD += rev.amount;
    
    return `
      <tr>
        <td>${new Date(rev.date).toLocaleDateString('en-GB')}</td>
        <td>${rev.description || '-'}</td>
        <td>${rev.amount.toLocaleString('ar-EG')}</td>
        <td>${rev.currency}</td>
        <td>${getServiceTypeName(rev.serviceType)}</td>
        <td>${rev.category || '-'}</td>
      </tr>
    `;
  }).join('');
  
  const htmlContent = `
    <div class="header">
      <h1>📊 تقرير الإيرادات</h1>
      <p>الشهر: ${month} / السنة: ${year}</p>
      <p>تاريخ التقرير: ${new Date().toLocaleDateString('en-GB')}</p>
    </div>
    
    <table>
      <thead>
        <tr>
          <th>التاريخ</th>
          <th>الوصف</th>
          <th>المبلغ</th>
          <th>العملة</th>
          <th>نوع الخدمة</th>
          <th>الفئة</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr class="total-row">
          <td colspan="2">الإجمالي</td>
          <td colspan="4">
            ${totalEGP > 0 ? `${totalEGP.toLocaleString('ar-EG')} ج.م` : ''}
            ${totalSAR > 0 ? (totalEGP > 0 ? ' | ' : '') + `${totalSAR.toLocaleString('ar-EG')} ر.س` : ''}
            ${totalUSD > 0 ? ((totalEGP > 0 || totalSAR > 0) ? ' | ' : '') + `${totalUSD.toLocaleString('ar-EG')} $` : ''}
          </td>
        </tr>
      </tbody>
    </table>
  `;
  
  createPDFPreview(htmlContent);
};

/**
 * تصدير الإيرادات إلى Excel
 */
export const exportRevenuesToExcel = (revenues: any[], month: number, year: number) => {
  const getServiceTypeName = (type: string) => {
    switch(type) {
      case 'subscriptions': return 'اشتراكات';
      case 'sales': return 'مبيعات';
      case 'services': return 'خدمات';
      case 'other': return 'أخرى';
      default: return 'غير محدد';
    }
  };
  
  const headers = ['التاريخ', 'الوصف', 'المبلغ', 'العملة', 'نوع الخدمة', 'الفئة'];
  const data = revenues.map(r => [
    new Date(r.date).toLocaleDateString('en-GB'),
    r.description || '-',
    r.amount,
    r.currency,
    getServiceTypeName(r.serviceType),
    r.category || '-'
  ]);
  
  const ws = XLSX.utils.aoa_to_sheet([
    [`تقرير الإيرادات - ${month}/${year}`],
    [],
    headers,
    ...data
  ]);
  
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }];
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'الإيرادات');
  XLSX.writeFile(wb, `revenues-${month}-${year}.xlsx`);
};

/**
 * تصدير المصروفات إلى PDF
 */
export const exportExpensesToPDF = (expenses: any[], month: number, year: number) => {
  let totalEGP = 0, totalSAR = 0, totalUSD = 0;
  let operationalEGP = 0, operationalSAR = 0, operationalUSD = 0;
  let capitalEGP = 0, capitalSAR = 0, capitalUSD = 0;
  
  const rows = expenses.map(exp => {
    if (exp.currency === 'EGP') {
      totalEGP += exp.amount;
      if (exp.type === 'operational') operationalEGP += exp.amount;
      else capitalEGP += exp.amount;
    } else if (exp.currency === 'SAR') {
      totalSAR += exp.amount;
      if (exp.type === 'operational') operationalSAR += exp.amount;
      else capitalSAR += exp.amount;
    } else if (exp.currency === 'USD') {
      totalUSD += exp.amount;
      if (exp.type === 'operational') operationalUSD += exp.amount;
      else capitalUSD += exp.amount;
    }
    
    return `
      <tr>
        <td>${new Date(exp.date).toLocaleDateString('en-GB')}</td>
        <td>${exp.description}</td>
        <td>${exp.amount.toLocaleString('ar-EG')}</td>
        <td>${exp.currency}</td>
        <td>${exp.type === 'operational' ? 'تشغيلي' : 'رأسمالي'}</td>
        <td>${exp.category}</td>
      </tr>
    `;
  }).join('');
  
  const htmlContent = `
    <div class="header">
      <h1>📉 تقرير المصروفات</h1>
      <p>الشهر: ${month} / السنة: ${year}</p>
      <p>تاريخ التقرير: ${new Date().toLocaleDateString('en-GB')}</p>
    </div>
    
    <table>
      <thead>
        <tr>
          <th>التاريخ</th>
          <th>الوصف</th>
          <th>المبلغ</th>
          <th>العملة</th>
          <th>النوع</th>
          <th>الفئة</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr class="total-row">
          <td colspan="2">🔧 مصروفات تشغيلية</td>
          <td colspan="4">
            ${operationalEGP > 0 ? `${operationalEGP.toLocaleString('ar-EG')} ج.م` : ''}
            ${operationalSAR > 0 ? (operationalEGP > 0 ? ' | ' : '') + `${operationalSAR.toLocaleString('ar-EG')} ر.س` : ''}
            ${operationalUSD > 0 ? ((operationalEGP > 0 || operationalSAR > 0) ? ' | ' : '') + `${operationalUSD.toLocaleString('ar-EG')} $` : ''}
          </td>
        </tr>
        <tr class="total-row">
          <td colspan="2">🏗️ مصروفات رأسمالية</td>
          <td colspan="4">
            ${capitalEGP > 0 ? `${capitalEGP.toLocaleString('ar-EG')} ج.م` : ''}
            ${capitalSAR > 0 ? (capitalEGP > 0 ? ' | ' : '') + `${capitalSAR.toLocaleString('ar-EG')} ر.س` : ''}
            ${capitalUSD > 0 ? ((capitalEGP > 0 || capitalSAR > 0) ? ' | ' : '') + `${capitalUSD.toLocaleString('ar-EG')} $` : ''}
          </td>
        </tr>
        <tr class="total-row">
          <td colspan="2">📊 إجمالي المصروفات</td>
          <td colspan="4">
            ${totalEGP > 0 ? `${totalEGP.toLocaleString('ar-EG')} ج.م` : ''}
            ${totalSAR > 0 ? (totalEGP > 0 ? ' | ' : '') + `${totalSAR.toLocaleString('ar-EG')} ر.س` : ''}
            ${totalUSD > 0 ? ((totalEGP > 0 || totalSAR > 0) ? ' | ' : '') + `${totalUSD.toLocaleString('ar-EG')} $` : ''}
          </td>
        </tr>
      </tbody>
    </table>
  `;
  
  createPDFPreview(htmlContent);
};

/**
 * تصدير المصروفات إلى Excel
 */
export const exportExpensesToExcel = (expenses: any[], month: number, year: number) => {
  const headers = ['التاريخ', 'الوصف', 'المبلغ', 'العملة', 'النوع', 'الفئة'];
  const data = expenses.map(e => [
    new Date(e.date).toLocaleDateString('en-GB'),
    e.description,
    e.amount,
    e.currency,
    e.type === 'operational' ? 'تشغيلي' : 'رأسمالي',
    e.category
  ]);
  
  const ws = XLSX.utils.aoa_to_sheet([
    [`تقرير المصروفات - ${month}/${year}`],
    [],
    headers,
    ...data
  ]);
  
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }];
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'المصروفات');
  XLSX.writeFile(wb, `expenses-${month}-${year}.xlsx`);
};

/**
 * تصدير الموظفين إلى PDF
 */
export const exportEmployeesToPDF = (employees: any[]) => {
  const rows = employees.map(emp => `
    <tr>
      <td>${emp.name}</td>
      <td>${emp.position}</td>
      <td>${emp.departmentName || '-'}</td>
      <td>${emp.salary.toLocaleString('ar-EG')} ${emp.salaryCurrency === 'EGP' ? 'ج.م' : emp.salaryCurrency === 'SAR' ? 'ر.س' : '$'}</td>
      <td>${emp.phone}</td>
      <td>${emp.email}</td>
      <td>${emp.isActive ? '✅ نشط' : '❌ غير نشط'}</td>
    </tr>
  `).join('');
  
  const htmlContent = `
    <div class="header">
      <h1>👥 تقرير الموظفين</h1>
      <p>إجمالي عدد الموظفين: ${employees.length}</p>
      <p>تاريخ التقرير: ${new Date().toLocaleDateString('en-GB')}</p>
    </div>
    
    <table>
      <thead>
        <tr>
          <th>الاسم</th>
          <th>المسمى الوظيفي</th>
          <th>القسم</th>
          <th>الراتب</th>
          <th>الهاتف</th>
          <th>البريد الإلكتروني</th>
          <th>الحالة</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
  
  createPDFPreview(htmlContent);
};

/**
 * تصدير الموظفين إلى Excel
 */
export const exportEmployeesToExcel = (employees: any[]) => {
  const headers = ['الاسم', 'المسمى الوظيفي', 'القسم', 'الراتب', 'العملة', 'الهاتف', 'البريد الإلكتروني', 'الحالة'];
  const data = employees.map(e => [
    e.name,
    e.position,
    e.departmentName || '-',
    e.salary,
    e.salaryCurrency,
    e.phone,
    e.email,
    e.isActive ? 'نشط' : 'غير نشط'
  ]);
  
  const ws = XLSX.utils.aoa_to_sheet([
    ['تقرير الموظفين'],
    [],
    headers,
    ...data
  ]);
  
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }];
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'الموظفين');
  XLSX.writeFile(wb, `employees-${new Date().toISOString().split('T')[0]}.xlsx`);
};

// ─── Salaries Export Helpers ─────────────────────────────────────────────────

const getMonthNameAr = (month: number): string => {
  const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  return months[month - 1] || '';
};

const getCurrSymbol = (c: string): string => {
  switch (c) {
    case 'EGP': return 'ج.م';
    case 'SAR': return 'ر.س';
    case 'USD': return '$';
    case 'AED': return 'د.إ';
    default: return c;
  }
};

/**
 * تصدير كشف الرواتب الشهرية إلى PDF
 */
export const exportSalariesToPDF = (salaries: any[], month: number, year: number, statistics: any) => {
  const monthName = getMonthNameAr(month);

  const rows = salaries.map((salary, index) => {
    const totalAdditions = (salary.totalBonuses || 0) + (salary.totalAllowances || 0);
    const totalDeductions = (salary.totalDeductions || 0) + (salary.totalLateDeductions || 0) + (salary.totalAbsenceDeductions || 0);
    const curr = getCurrSymbol(salary.currency);
    const paidStyle = salary.isPaid
      ? 'background:#dcfce7; color:#15803d; padding:3px 12px; border-radius:20px; font-size:12px; font-weight:600;'
      : 'background:#fef9c3; color:#b45309; padding:3px 12px; border-radius:20px; font-size:12px; font-weight:600;';

    return `
      <tr>
        <td style="text-align:center; color:#6b7280; font-size:13px;">${index + 1}</td>
        <td>
          <div style="font-weight:600; color:#111827;">${salary.employeeId?.name || '-'}</div>
          <div style="font-size:11px; color:#9ca3af;">${salary.employeeId?.email || ''}</div>
        </td>
        <td style="color:#374151;">${salary.employeeId?.position || '-'}</td>
        <td style="font-weight:600;">${salary.baseSalary.toLocaleString('ar-EG')} <span style="color:#9ca3af; font-size:11px;">${curr}</span></td>
        <td style="color:#16a34a; font-weight:600;">${totalAdditions > 0 ? '+' + totalAdditions.toLocaleString('ar-EG') : '-'}</td>
        <td style="color:#dc2626; font-weight:600;">${totalDeductions > 0 ? '-' + totalDeductions.toLocaleString('ar-EG') : '-'}</td>
        <td style="font-weight:700; color:#1d4ed8; font-size:15px;">${salary.netSalary.toLocaleString('ar-EG')} <span style="color:#9ca3af; font-size:11px;">${curr}</span></td>
        <td style="text-align:center;"><span style="${paidStyle}">${salary.isPaid ? '✓ تم الصرف' : '⏳ لم يُصرف'}</span></td>
      </tr>
    `;
  }).join('');

  const totalNet = salaries.reduce((s, r) => s + r.netSalary, 0);

  const htmlContent = `
    <div class="header">
      <h1>💰 كشف رواتب شهر ${monthName} ${year}</h1>
      <p>تاريخ الإصدار: ${new Date().toLocaleDateString('ar-EG')} &nbsp;|&nbsp; عدد الموظفين: ${statistics.totalEmployees}</p>
    </div>

    <div style="display:flex; gap:12px; margin-bottom:28px; flex-wrap:wrap;">
      <div style="flex:1; min-width:140px; background:#eff6ff; border:1px solid #bfdbfe; border-radius:10px; padding:16px; text-align:center;">
        <div style="font-size:26px; font-weight:700; color:#1d4ed8;">${statistics.totalEmployees}</div>
        <div style="color:#6b7280; font-size:12px; margin-top:4px;">إجمالي الموظفين</div>
      </div>
      <div style="flex:2; min-width:180px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; padding:16px; text-align:center;">
        <div style="font-size:20px; font-weight:700; color:#15803d;">${(statistics.totalNetSalary || 0).toLocaleString('ar-EG')}</div>
        <div style="color:#6b7280; font-size:12px; margin-top:4px;">إجمالي صافي الرواتب</div>
      </div>
      <div style="flex:1; min-width:140px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; padding:16px; text-align:center;">
        <div style="font-size:22px; font-weight:700; color:#15803d;">${statistics.paidCount}</div>
        <div style="color:#6b7280; font-size:12px; margin-top:4px;">✓ تم الصرف</div>
      </div>
      <div style="flex:1; min-width:140px; background:#fffbeb; border:1px solid #fde68a; border-radius:10px; padding:16px; text-align:center;">
        <div style="font-size:22px; font-weight:700; color:#d97706;">${statistics.unpaidCount}</div>
        <div style="color:#6b7280; font-size:12px; margin-top:4px;">⏳ لم يُصرف</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:36px;">#</th>
          <th>الموظف</th>
          <th>المسمى الوظيفي</th>
          <th>الراتب الأساسي</th>
          <th>الإضافات</th>
          <th>الخصومات</th>
          <th>الصافي</th>
          <th style="text-align:center;">الحالة</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr class="total-row" style="border-top:3px solid #3b82f6;">
          <td colspan="6" style="text-align:right; padding-left:20px; font-size:15px;">إجمالي صافي الرواتب</td>
          <td colspan="2" style="font-size:17px; color:#1d4ed8;">${totalNet.toLocaleString('ar-EG')}</td>
        </tr>
      </tbody>
    </table>
  `;

  createPDFPreview(htmlContent);
};

/**
 * تصدير كشف الرواتب الشهرية إلى Excel
 */
export const exportSalariesToExcel = (salaries: any[], month: number, year: number, statistics: any) => {
  const monthName = getMonthNameAr(month);

  const headers = [
    '#', 'الاسم', 'البريد الإلكتروني', 'المسمى الوظيفي',
    'الراتب الأساسي', 'الحوافز', 'البدلات', 'الخصومات', 'خصم التأخير', 'خصم الغياب',
    'إجمالي الإضافات', 'إجمالي الخصومات', 'صافي الراتب', 'العملة', 'حالة الصرف'
  ];

  const data = salaries.map((salary, index) => [
    index + 1,
    salary.employeeId?.name || '-',
    salary.employeeId?.email || '-',
    salary.employeeId?.position || '-',
    salary.baseSalary,
    salary.totalBonuses || 0,
    salary.totalAllowances || 0,
    salary.totalDeductions || 0,
    salary.totalLateDeductions || 0,
    salary.totalAbsenceDeductions || 0,
    (salary.totalBonuses || 0) + (salary.totalAllowances || 0),
    (salary.totalDeductions || 0) + (salary.totalLateDeductions || 0) + (salary.totalAbsenceDeductions || 0),
    salary.netSalary,
    getCurrSymbol(salary.currency),
    salary.isPaid ? 'تم الصرف' : 'لم يُصرف'
  ]);

  const totalsRow = [
    '', 'الإجمالي', '', '',
    salaries.reduce((s, r) => s + r.baseSalary, 0),
    salaries.reduce((s, r) => s + (r.totalBonuses || 0), 0),
    salaries.reduce((s, r) => s + (r.totalAllowances || 0), 0),
    salaries.reduce((s, r) => s + (r.totalDeductions || 0), 0),
    salaries.reduce((s, r) => s + (r.totalLateDeductions || 0), 0),
    salaries.reduce((s, r) => s + (r.totalAbsenceDeductions || 0), 0),
    salaries.reduce((s, r) => s + (r.totalBonuses || 0) + (r.totalAllowances || 0), 0),
    salaries.reduce((s, r) => s + (r.totalDeductions || 0) + (r.totalLateDeductions || 0) + (r.totalAbsenceDeductions || 0), 0),
    salaries.reduce((s, r) => s + r.netSalary, 0),
    '', ''
  ];

  const ws = XLSX.utils.aoa_to_sheet([
    [`كشف رواتب شهر ${monthName} ${year}`],
    [`تاريخ الإصدار: ${new Date().toLocaleDateString('en-GB')}`],
    [],
    [
      `إجمالي الموظفين: ${statistics.totalEmployees}`, '', '',
      `تم الصرف: ${statistics.paidCount}`, '', '',
      `لم يُصرف: ${statistics.unpaidCount}`, '', '',
      `إجمالي الرواتب: ${(statistics.totalNetSalary || 0).toLocaleString()}`
    ],
    [],
    headers,
    ...data,
    [],
    totalsRow
  ]);

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } },
  ];

  ws['!cols'] = [
    { wch: 5 },  { wch: 25 }, { wch: 28 }, { wch: 20 },
    { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
    { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 16 },
    { wch: 15 }, { wch: 10 }, { wch: 15 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `رواتب ${monthName}`);
  XLSX.writeFile(wb, `salaries-${month}-${year}.xlsx`);
};
