import api from './api';

export interface PersonRef {
  _id?: string;
  id?: string;
  name?: string;
}

export interface CalMonth {
  id: string;
  month: number;
  year: number;
  title: string;
  iconColor: string;
  status: 'active' | 'done';
  order: number;
  ownerId?: PersonRef | string;
  createdAt?: string;
}

export interface CalComment {
  id: string;
  authorId: PersonRef | string;
  authorName?: string;
  content: string;
  createdAt: string;
}

export interface CalEntry {
  id: string;
  monthId: string;
  title: string;
  contentType: string;
  account: string;
  publishDate?: string;
  videoLink: string;
  platforms: string[];
  assigneeId?: PersonRef | string;
  editorId?: PersonRef | string;
  collaboration: string;
  uploadDeadline: string;
  filmed: boolean;
  done: boolean;
  ytSevenDays?: number;
  instaSevenDays?: number;
  tiktokSevenDays?: number;
  script: string;
  comments: CalComment[];
  isRest: boolean;
  rowOrder: number;
}

export const calendarApi = {
  getMonths: (): Promise<CalMonth[]> =>
    api.get('/content-calendar/months').then((r) => r.data),
  createMonth: (data: { month: number; year: number; iconColor?: string; ownerId?: string }): Promise<CalMonth> =>
    api.post('/content-calendar/months', data).then((r) => r.data),
  updateMonth: (id: string, data: Partial<CalMonth>): Promise<CalMonth> =>
    api.patch(`/content-calendar/months/${id}`, data).then((r) => r.data),
  deleteMonth: (id: string): Promise<any> =>
    api.delete(`/content-calendar/months/${id}`).then((r) => r.data),

  getEntries: (monthId: string): Promise<CalEntry[]> =>
    api.get(`/content-calendar/months/${monthId}/entries`).then((r) => r.data),
  createEntry: (monthId: string, data: Partial<CalEntry>): Promise<CalEntry> =>
    api.post(`/content-calendar/months/${monthId}/entries`, data).then((r) => r.data),
  updateEntry: (id: string, data: Partial<CalEntry>): Promise<CalEntry> =>
    api.patch(`/content-calendar/entries/${id}`, data).then((r) => r.data),
  deleteEntry: (id: string): Promise<any> =>
    api.delete(`/content-calendar/entries/${id}`).then((r) => r.data),
  addComment: (id: string, content: string): Promise<CalEntry> =>
    api.post(`/content-calendar/entries/${id}/comments`, { content }).then((r) => r.data),
};

// Utility used by both pages.
export const personName = (p?: PersonRef | string): string => {
  if (!p) return '';
  if (typeof p === 'string') return '';
  return p.name || '';
};

export const personId = (p?: PersonRef | string): string => {
  if (!p) return '';
  if (typeof p === 'string') return p;
  return p._id || p.id || '';
};
