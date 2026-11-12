import { BusinessRuleError } from '../../../../shared/errors/business-rule-error';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { AccreditationFilter } from '../contracts/accreditation-filters';
import type {
  AccreditationReportReader,
  AccreditationReportWriter,
} from '../ports/accreditation-report.port';
import { reportScope } from '../services/report-scope';

/** HU-004: reporte ejecutivo en PDF del filtro aplicado y solo de las carreras del administrador. */
export class ExportAccreditationPdfUseCase {
  constructor(
    private readonly reader: AccreditationReportReader,
    private readonly writer: AccreditationReportWriter,
  ) {}

  async execute(actor: ActorContext, filter: AccreditationFilter) {
    const careerIds = reportScope(actor, filter.careerId);
    const report = await this.reader.read(careerIds, filter);
    if (report.indicators.totalResponses === 0) {
      throw new BusinessRuleError(
        'missing',
        'ACCREDITATION_EMPTY_PERIOD',
        'No hay información para exportar en este periodo',
      );
    }
    return this.writer.build(report);
  }
}
