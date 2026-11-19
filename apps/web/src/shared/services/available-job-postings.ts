import type {
  AvailableJobPosting,
  AvailableJobPostingDetail,
} from '@umsspira/shared-types';
import { apiFetch } from './api-client';

export function listAvailableJobPostings(): Promise<AvailableJobPosting[]> {
  return apiFetch<AvailableJobPosting[]>('/api/v1/job-postings');
}

export function getAvailableJobPosting(id: string): Promise<AvailableJobPostingDetail> {
  return apiFetch<AvailableJobPostingDetail>(
    `/api/v1/job-postings/${encodeURIComponent(id)}`,
  );
}
