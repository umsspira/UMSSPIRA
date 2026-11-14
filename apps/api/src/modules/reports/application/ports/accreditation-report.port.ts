import type { AccreditationReport } from '../../domain/entities/accreditation-report';
import type { AccreditationFilter } from '../contracts/accreditation-filters';
import type { ReportFile } from '../contracts/report-inputs';

export const ACCREDITATION_REPORT_READER = Symbol('ACCREDITATION_REPORT_READER');
export const ACCREDITATION_PDF_WRITER = Symbol('ACCREDITATION_PDF_WRITER');

/** Arma los datos del tablero de las carreras permitidas (T1.1 y T2.1). */
export interface AccreditationReportReader {
  read(careerIds: readonly string[], filter: AccreditationFilter): Promise<AccreditationReport>;
}

export interface AccreditationReportWriter {
  build(report: AccreditationReport): Promise<ReportFile>;
}
