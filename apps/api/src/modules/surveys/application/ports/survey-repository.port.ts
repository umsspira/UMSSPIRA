import type { SubmitSurveyInput } from '../contracts/submit-survey.input';

export const SURVEY_REPOSITORY = Symbol('SURVEY_REPOSITORY');

export interface SurveyReportItem {
  id: string;
  condicionLaboral: string;
  cargo: string | null;
  empresa: string | null;
  area: string | null;
  modalidad: string | null;
  salarioMensual: string | null;
  tiempoInsercion: string | null;
  fechaEnvio: string;
}

export interface SurveyReportResult {
  total: number;
  trabajan: number;
  noTrabajan: number;
  porModalidad: Record<string, number>;
  porSalario: Record<string, number>;
  porInsercion: Record<string, number>;
  respuestas: SurveyReportItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SurveyRepositoryPort {
  save(input: SubmitSurveyInput): Promise<{
    id: string;
  }>;

  getSurveyReport(params: {
    careerIds: string[];
    page?: number;
    limit?: number;
  }): Promise<SurveyReportResult>;
}