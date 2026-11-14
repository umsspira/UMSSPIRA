import type { ActorContext } from '../../../../shared/security/contexts/actor-context';

import type { ReportRepository } from '../ports/report-repository.port';

import { reportScope } from '../services/report-scope';
import type { AccreditationFilters } from '../contracts/accreditation-filters';

export class GetAccreditationDashboardUseCase {
  constructor(private readonly repository: ReportRepository) {}

  execute(actor: ActorContext, careerId?: string, filters?: AccreditationFilters) {
    const careerIds = reportScope(actor, careerId);

    if (filters) {
      return this.repository.accreditationDashboard(careerIds, filters);
    }
    return this.repository.accreditationDashboard(careerIds);
  }
}
