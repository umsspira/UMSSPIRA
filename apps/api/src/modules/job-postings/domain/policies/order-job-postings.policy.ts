import type { AvailableJobPosting } from '../entities/available-job-posting.entity';

export function orderJobPostingsByAffinity(
  postings: readonly AvailableJobPosting[],
): AvailableJobPosting[] {
  return [...postings].sort((left, right) => {
    const leftAffinity = left.affinityPercentage;
    const rightAffinity = right.affinityPercentage;

    if (leftAffinity === null && rightAffinity !== null) return 1;
    if (leftAffinity !== null && rightAffinity === null) return -1;
    if (leftAffinity !== null && rightAffinity !== null && leftAffinity !== rightAffinity) {
      return rightAffinity - leftAffinity;
    }

    const titleOrder = left.title.localeCompare(right.title, 'es', { sensitivity: 'base' });
    return titleOrder || left.id.localeCompare(right.id);
  });
}
