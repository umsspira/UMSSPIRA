import type { ActorContext } from '../../../../shared/security/contexts/actor-context';

import type { AccreditationCachePort } from '../ports/accreditation-cache.port';
import type { ReportRepository } from '../ports/report-repository.port';

import { reportScope } from '../services/report-scope';
import type { AccreditationDashboard } from '../contracts/accreditation-dashboard';
import type { AccreditationFilters } from '../contracts/accreditation-filters';

export class GetAccreditationDashboardUseCase {
  constructor(
    private readonly repository: ReportRepository,
    private readonly cache?: AccreditationCachePort,
  ) {}

  async execute(
    actor: ActorContext,
    careerId?: string,
    filters?: AccreditationFilters,
  ): Promise<AccreditationDashboard> {
    const careerIds = reportScope(actor, careerId);
    const cacheKey = this.cache?.buildAccreditationDashboardCacheKey(careerIds, filters);

    if (this.cache && careerIds.length === 1 && cacheKey) {
      const cached = await this.cache.get<AccreditationDashboard>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const dashboard = filters
      ? await this.repository.accreditationDashboard(careerIds, filters)
      : await this.repository.accreditationDashboard(careerIds);

    if (this.cache && careerIds.length === 1 && cacheKey) {
      await this.cache.set(cacheKey, dashboard);
    }

    return dashboard;
  }
}
