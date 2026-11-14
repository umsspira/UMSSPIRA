import type { JobPostingSearchDocument } from '../../../shared/infrastructure/search/job-posting-search-document';

export type IndexedJobPosting = JobPostingSearchDocument;

export interface ActiveJobPostingsResult {
  data: IndexedJobPosting[];
  /** Total exacto de coincidencias del indice; no es un conteo validado contra Prisma. */
  total: number;
}

export interface JobPostingsSearchOptions {
  page?: number;
  limit?: number;
  search?: string;
}
