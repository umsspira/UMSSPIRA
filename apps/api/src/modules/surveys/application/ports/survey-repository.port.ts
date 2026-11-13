import type { SubmitSurveyInput } from '../contracts/submit-survey.input';
import type {
  SurveyAdminInput,
  SurveyAdminPatch,
  SurveyAdminRecord,
} from '../contracts/survey-admin.input';

export const SURVEY_REPOSITORY = Symbol('SURVEY_REPOSITORY');

export interface ActiveSurvey {
  id: string;
  titulo?: string | null;
  id_carrera?: string | null;
  fecha_inicio?: Date | null;
  fecha_fin?: Date | null;
  estado?: string | null;
}

export interface SurveyRepositoryPort {
  save(input: SubmitSurveyInput): Promise<{
    id: string;
  }>;
  listManaged(actorId: string, careerIds: readonly string[]): Promise<SurveyAdminRecord[]>;
  createManaged(actorId: string, careerIds: readonly string[], input: SurveyAdminInput): Promise<SurveyAdminRecord>;
  updateManaged(actorId: string, careerIds: readonly string[], id: string, input: SurveyAdminPatch): Promise<SurveyAdminRecord>;
  publishManaged(actorId: string, careerIds: readonly string[], id: string): Promise<SurveyAdminRecord>;
  unpublishManaged(actorId: string, careerIds: readonly string[], id: string): Promise<SurveyAdminRecord>;

  findActiveSurveyByCareer(
    careerId: string,
    surveyId?: string,
  ): Promise<ActiveSurvey | null>;

  findActiveSurveyForGraduate(
    graduateId: string,
    surveyId?: string,
  ): Promise<ActiveSurvey | null>;
}
