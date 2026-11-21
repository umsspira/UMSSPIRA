export const JOB_POSTINGS_ROUTE = '/job-postings';

export function jobPostingDetailRoute(id: string): string {
  return `/portal/job-postings/detalle?jobId=${encodeURIComponent(id)}`;
}
