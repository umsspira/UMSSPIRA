import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { CompetencyHeatmap } from '../contracts/report-inputs';
import type { ReportRepository } from '../ports/report-repository.port';
import { reportScope } from '../services/report-scope';

export class GetCompetencyHeatmapUseCase {
  constructor(private readonly repository: ReportRepository) {}

  execute(actor: ActorContext): Promise<CompetencyHeatmap> {
    // Integración T2.2/T2.3: el frontend recibe áreas, cohortes y celdas ya
    // filtradas por la carrera del administrador; no necesita consultar radar.
    return this.repository.competencyHeatmap(reportScope(actor));
  }
}
