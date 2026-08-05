import api from './api';

export type SectionStatus = 'green' | 'yellow' | 'red';

export interface ReportSectionDef {
  key: string;
  label: string;
  icon: string;
  placeholder: string;
}

// أقسام الريبورت الخمسة (لازم keys تطابق الباك إند)
export const REPORT_SECTIONS: ReportSectionDef[] = [
  { key: 'finance', label: 'إيرادات ومصروفات', icon: '💰', placeholder: 'إجمالي إيرادات النهاردة، أي مصروفات كبيرة، ملاحظات مالية...' },
  { key: 'attendance', label: 'حضور واشتراكات', icon: '🧑‍🤝‍🧑', placeholder: 'الحضور والغياب، اشتراكات جديدة/ملغاة، ملاحظات على الموظفين...' },
  { key: 'maintenance', label: 'صيانة ومشاكل تقنية', icon: '🛠️', placeholder: 'أعطال أجهزة، صيانة، مشاكل نظام/إنترنت، حاجة محتاجة تصليح...' },
  { key: 'incidents', label: 'شكاوى وحوادث', icon: '⚠️', placeholder: 'شكاوى عملاء، أي حادث أو موقف حصل النهاردة...' },
  { key: 'tasks', label: 'التاسكات', icon: '✅', placeholder: 'اللي اتعمل النهاردة، اللي لسه، أي حاجة متأخرة...' },
];

export interface ReportSection {
  key: string;
  status: SectionStatus;
  text: string;
}

export interface DailyReport {
  id: string;
  date: string;
  createdById: string;
  createdByName: string;
  sections: ReportSection[];
  overallStatus: SectionStatus;
  note?: string;
  createdAt: string;
}

export const statusMeta: Record<SectionStatus, { label: string; emoji: string; dot: string; bar: string; ring: string; text: string }> = {
  green: { label: 'تمام', emoji: '🟢', dot: 'bg-emerald-500', bar: 'bg-emerald-500', ring: 'ring-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
  yellow: { label: 'محتاج انتباه', emoji: '🟡', dot: 'bg-amber-500', bar: 'bg-amber-500', ring: 'ring-amber-500', text: 'text-amber-600 dark:text-amber-400' },
  red: { label: 'مشكلة', emoji: '🔴', dot: 'bg-rose-500', bar: 'bg-rose-500', ring: 'ring-rose-500', text: 'text-rose-600 dark:text-rose-400' },
};

export const dailyReportApi = {
  getAll: async (): Promise<DailyReport[]> => (await api.get('/daily-reports')).data,
  create: async (payload: { date: string; sections: { key: string; status: SectionStatus; text: string }[]; note?: string }): Promise<DailyReport> =>
    (await api.post('/daily-reports', payload)).data,
  remove: async (id: string): Promise<void> => { await api.delete(`/daily-reports/${id}`); },
};
