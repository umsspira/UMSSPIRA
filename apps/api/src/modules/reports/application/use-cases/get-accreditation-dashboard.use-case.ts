import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { RedisService } from '../../../../shared/infrastructure/redis/redis.service';

import type { ReportRepository } from '../ports/report-repository.port';

import { reportScope } from '../services/report-scope';
import type { AccreditationDashboard } from '../contracts/accreditation-dashboard';
import type { AccreditationFilters } from '../contracts/accreditation-filters';

export class GetAccreditationDashboardUseCase {
  constructor(
    private readonly repository: ReportRepository,
    private readonly redis?: RedisService,
  ) {}

  async execute(
    actor: ActorContext,
    careerId?: string,
    filters?: AccreditationFilters,
  ): Promise<AccreditationDashboard> {
    const careerIds = reportScope(actor, careerId);
    const normalizedCareerIds = [...new Set(careerIds)].sort();
    const normalizedFilters = this.normalizeFilters(filters);
    const cacheKey = this.buildCacheKey(normalizedCareerIds, normalizedFilters);

    if (this.redis && careerIds.length === 1) {
      const cached = await this.redis.get<AccreditationDashboard>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const dashboard = filters
      ? await this.repository.accreditationDashboard(careerIds, filters)
      : await this.repository.accreditationDashboard(careerIds);

    if (this.redis && careerIds.length === 1) {
      await this.redis.set(cacheKey, dashboard, 300);
    }

    return dashboard;
  }

  private normalizeFilters(filters?: AccreditationFilters): AccreditationFilters | undefined {
    if (!filters) {
      return undefined;
    }
    const normalized: AccreditationFilters = {};
    if (filters.cohort !== undefined) {
      normalized.cohort = Number(filters.cohort);
    }
    if (filters.semester !== undefined) {
      normalized.semester = String(filters.semester).trim();
    }
    return Object.keys(normalized).length ? normalized : undefined;
  }

  private buildCacheKey(careerIds: readonly string[], filters?: AccreditationFilters): string {
    const normalizedCareerText = careerIds.length ? careerIds.join(',') : 'all';
    const filterText = filters ? JSON.stringify(filters) : 'general';
    return `acreditacion:indicadores:carrera:${normalizedCareerText}:filtros:${filterText}`;
  }
}
