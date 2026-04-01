import PDFDocument from 'pdfkit';
import { DailyReportData } from './dailyReport.service';
import path from 'path';

// دالة لعكس النص العربي للعرض الصحيح
const reverseArabic = (text: string): string => {
  return text.split('').reverse().join('');
};

// تنسيق الأرقام بالعربية
const formatNumber = (num: number): string => {
  return num.toLocaleString('ar-EG');
};

export const generateReportPDF = async (
  reportData: DailyReportData,
  companyName: string
): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: 'التقرير اليومي',
          Author: companyName,
        }
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const { attendance, financial, tasks, alerts } = reportData;
      const dateStr = reportData.date.toLocaleDateString('ar-EG', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // ألوان
      const primaryColor = '#f59e0b';
      const headerBg = '#1f2937';
      const successColor = '#059669';
      const dangerColor = '#dc2626';
      const warningColor = '#f59e0b';

      // رأس التقرير
      doc.rect(0, 0, 595, 100).fill(headerBg);
      doc.fillColor('white')
         .fontSize(28)
         .text('Daily Report', 50, 30, { align: 'center' });
      doc.fontSize(14)
         .text(companyName, 50, 65, { align: 'center' });

      // التاريخ
      doc.fillColor(headerBg)
         .fontSize(12)
         .text(`Date: ${reportData.date.toLocaleDateString('en-US')}`, 50, 120, { align: 'right' });

      let yPos = 150;

      // قسم الحضور والغياب
      doc.fillColor(primaryColor)
         .fontSize(16)
         .text('Attendance Summary', 50, yPos);

      yPos += 25;

      // جدول الحضور
      const attendanceData = [
        ['Total Employees', attendance.totalEmployees.toString()],
        ['Present', attendance.present.toString()],
        ['Late', attendance.late.toString()],
        ['Absent', attendance.absent.toString()],
        ['On Leave', attendance.onLeave.toString()]
      ];

      attendanceData.forEach((row, i) => {
        const bgColor = i % 2 === 0 ? '#f9fafb' : '#ffffff';
        doc.rect(50, yPos, 495, 25).fill(bgColor);
        doc.fillColor('#374151')
           .fontSize(11)
           .text(row[0], 60, yPos + 7);

        let valueColor = '#374151';
        if (row[0] === 'Present') valueColor = successColor;
        if (row[0] === 'Absent') valueColor = dangerColor;
        if (row[0] === 'Late') valueColor = warningColor;

        doc.fillColor(valueColor)
           .text(row[1], 450, yPos + 7, { align: 'right', width: 85 });
        yPos += 25;
      });

      yPos += 20;

      // قسم الملخص المالي
      doc.fillColor(primaryColor)
         .fontSize(16)
         .text('Financial Summary', 50, yPos);

      yPos += 25;

      const financialData = [
        ['Revenue', `${formatNumber(financial.revenue)} EGP`, successColor],
        ['Expenses', `${formatNumber(financial.expenses)} EGP`, dangerColor],
        ['Net Profit', `${formatNumber(financial.netProfit)} EGP`, financial.netProfit >= 0 ? successColor : dangerColor]
      ];

      financialData.forEach((row, i) => {
        const bgColor = i % 2 === 0 ? '#f9fafb' : '#ffffff';
        doc.rect(50, yPos, 495, 25).fill(bgColor);
        doc.fillColor('#374151')
           .fontSize(11)
           .text(row[0], 60, yPos + 7);
        doc.fillColor(row[2] as string)
           .text(row[1], 350, yPos + 7, { align: 'right', width: 185 });
        yPos += 25;
      });

      yPos += 20;

      // قسم المهام
      doc.fillColor(primaryColor)
         .fontSize(16)
         .text('Tasks Summary', 50, yPos);

      yPos += 25;

      const tasksData = [
        ['Completed Today', tasks.completed.toString(), successColor],
        ['In Progress', tasks.pending.toString(), warningColor],
        ['Overdue', tasks.overdue.toString(), dangerColor]
      ];

      tasksData.forEach((row, i) => {
        const bgColor = i % 2 === 0 ? '#f9fafb' : '#ffffff';
        doc.rect(50, yPos, 495, 25).fill(bgColor);
        doc.fillColor('#374151')
           .fontSize(11)
           .text(row[0], 60, yPos + 7);
        doc.fillColor(row[2] as string)
           .text(row[1], 450, yPos + 7, { align: 'right', width: 85 });
        yPos += 25;
      });

      // قسم التنبيهات
      if (alerts.length > 0) {
        yPos += 20;
        doc.fillColor(primaryColor)
           .fontSize(16)
           .text('Alerts', 50, yPos);

        yPos += 25;

        doc.rect(50, yPos, 495, 20 + (alerts.length * 20)).fill('#fef3c7');
        doc.fillColor('#92400e')
           .fontSize(10);

        alerts.forEach((alert, i) => {
          doc.text(`• ${alert}`, 60, yPos + 10 + (i * 20));
        });
      }

      // تذييل الصفحة
      doc.fillColor('#9ca3af')
         .fontSize(9)
         .text('Generated by Gemawi Accounting System', 50, 780, { align: 'center' });
      doc.text(`Generated on: ${new Date().toLocaleString('en-US')}`, 50, 795, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
