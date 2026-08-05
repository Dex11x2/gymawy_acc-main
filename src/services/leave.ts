import api from './api';

export interface LeaveBalance {
  annual: number; annualTotal: number;
  emergency: number; emergencyTotal: number;
  permissionHoursUsed: number; permissionHoursTotal: number; permissionHoursLeft: number;
}

export interface LeaveReq {
  id: string;
  employeeId: any;
  employeeName: string;
  leaveType: 'annual' | 'emergency' | 'sick' | 'unpaid' | 'permission';
  startDate: string;
  endDate: string;
  days: number;
  hours?: number;
  startTime?: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  warnings?: string[];
  reviewedByName?: string;
  reviewNotes?: string;
  createdAt: string;
}

export const leaveTypeAr = (t: string): string => ({
  annual: 'أجازة سنوية', emergency: 'أجازة عارضة', sick: 'أجازة مرضية',
  unpaid: 'بدون راتب', permission: 'إذن',
} as Record<string, string>)[t] || 'أجازة';

export const leaveApi = {
  myBalance: () => api.get('/leave-requests/my-balance').then(r => r.data as LeaveBalance),
  mine: () => api.get('/leave-requests/mine').then(r => r.data as LeaveReq[]),
  all: () => api.get('/leave-requests').then(r => r.data as LeaveReq[]),
  create: (data: any) => api.post('/leave-requests', data).then(r => r.data),
  setStatus: (id: string, status: 'approved' | 'rejected', reviewNotes?: string) =>
    api.patch(`/leave-requests/${id}/status`, { status, reviewNotes }).then(r => r.data),
};
