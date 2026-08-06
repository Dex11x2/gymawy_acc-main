import api from './api';

export interface FinancialReportSend {
  id: string;
  month: number;
  year: number;
  sentById: string;
  sentByName: string;
  note?: string;
  summary?: string;
  createdAt: string;
}

export const financialReportApi = {
  send: async (payload: { month: number; year: number; note?: string; summary?: string }): Promise<FinancialReportSend> =>
    (await api.post('/financial-reports/send', payload)).data,
  recent: async (month?: number, year?: number): Promise<FinancialReportSend[]> =>
    (await api.get('/financial-reports', { params: { month, year } })).data,
};
