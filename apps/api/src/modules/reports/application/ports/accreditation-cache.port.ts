import type { AccreditationFilters } from '../contracts/accreditation-filters';

export const ACCREDITATION_CACHE = 'ACCREDITATION_CACHE';

export interface AccreditationCachePort {
  buildAccreditationDashboardCacheKey(
    careerIds: readonly string[],
    filters?: AccreditationFilters,
  ): string;
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
}
