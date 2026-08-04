import api from './api';
import { PersonRef, personName, personId } from './contentCalendar';

export type ReviewStepKind = 'upload' | 'revision' | 'edit_request' | 'approve';

export interface ReviewSeen {
  userId?: PersonRef | string;
  seenAt: string;
}

export interface ReviewStep {
  id: string;
  byId?: PersonRef | string;
  byName?: string;
  kind: ReviewStepKind;
  link?: string;
  note?: string;
  mentionIds?: (PersonRef | string)[];
  mentionNames?: string[];
  seenBy?: ReviewSeen[];
  createdAt: string;
}

export interface VideoReview {
  id: string;
  title: string;
  account?: string;
  createdById?: PersonRef | string;
  createdByName?: string;
  status: 'in_review' | 'changes_requested' | 'approved';
  currentMentionIds?: (PersonRef | string)[];
  steps: ReviewStep[];
  linkedEntryId?: string;
  finalLink?: string;
  approvedById?: PersonRef | string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReviewInput {
  title: string;
  account?: string;
  link?: string;
  note?: string;
  mentionIds?: string[];
  mentionNames?: string[];
}

export interface AddStepInput {
  kind: 'revision' | 'edit_request';
  link?: string;
  note?: string;
  mentionIds?: string[];
  mentionNames?: string[];
}

export interface ApproveInput {
  entryId: string;
  publishDate?: string;
  platforms?: string[];
  note?: string;
}

export const videoReviewApi = {
  getReviews: (params?: { status?: string; account?: string }): Promise<VideoReview[]> =>
    api.get('/video-reviews', { params }).then((r) => r.data),
  createReview: (data: CreateReviewInput): Promise<VideoReview> =>
    api.post('/video-reviews', data).then((r) => r.data),
  addStep: (id: string, data: AddStepInput): Promise<VideoReview> =>
    api.post(`/video-reviews/${id}/steps`, data).then((r) => r.data),
  markSeen: (id: string): Promise<VideoReview> =>
    api.post(`/video-reviews/${id}/seen`).then((r) => r.data),
  approve: (id: string, data: ApproveInput): Promise<VideoReview> =>
    api.post(`/video-reviews/${id}/approve`, data).then((r) => r.data),
  deleteReview: (id: string): Promise<any> =>
    api.delete(`/video-reviews/${id}`).then((r) => r.data),
};

export { personName, personId };
export type { PersonRef };
