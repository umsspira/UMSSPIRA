import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { CompetencyHeatmap } from '../contracts/report-inputs';
import type { ReportRepository } from '../ports/report-repository.port';
import { reportScope } from '../services/report-scope';
import type { AccreditationFilters } from '../contracts/accreditation-filters';

export class GetCompetencyHeatmapUseCase {
  constructor(private readonly repository: ReportRepository) {}

  execute(
    actor: ActorContext,
    careerId?: string,
    filters?: AccreditationFilters,
  ): Promise<CompetencyHeatmap> {
    const careerIds = reportScope(actor, careerId);
    if (filters) {
      return this.repository.competencyHeatmap(careerIds, filters);
    }
    return this.repository.competencyHeatmap(careerIds);
  }
}
