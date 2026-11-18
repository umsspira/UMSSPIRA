export const PUBLISHED_JOB_POSTING_STATUSES = ['PUBLICADO', 'PUBLICADA'] as const;

export function isJobPostingAvailable(
  status: string | null,
  closingDate: Date | null,
  now: Date,
): boolean {
  const isPublished = PUBLISHED_JOB_POSTING_STATUSES.some(
    (publishedStatus) => publishedStatus === status,
  );
  return isPublished && (closingDate === null || closingDate.getTime() > now.getTime());
}
