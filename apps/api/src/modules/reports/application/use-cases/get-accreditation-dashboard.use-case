import type { ActorContext } from
  '../../../../shared/security/contexts/actor-context';

import type { ReportRepository } from
  '../ports/report-repository.port';

import { reportScope } from
  '../services/report-scope';

export class GetAccreditationDashboardUseCase {
  constructor(
    private readonly repository: ReportRepository,
  ) {}

  execute(actor: ActorContext, careerId?: string) {
    const careerIds = reportScope(actor, careerId);

    return this.repository.accreditationDashboard(
      careerIds,
    );
  }
}
