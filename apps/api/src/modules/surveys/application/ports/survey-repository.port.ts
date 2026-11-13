import type { SubmitSurveyInput } from '../contracts/submit-survey.input';
import type {
  SurveyAdminInput,
  SurveyAdminPatch,
  SurveyAdminRecord,
} from '../contracts/survey-admin.input';

export const SURVEY_REPOSITORY = Symbol('SURVEY_REPOSITORY');

export interface SurveyRepositoryPort {
  save(input: SubmitSurveyInput): Promise<{
    id: string;
  }>;
  // T5.2 reutiliza este repositorio para resolver la encuesta publicada y
  // vigente que consumen /status, /me y el envío del titulado.
  listManaged(actorId: string, careerIds: readonly string[]): Promise<SurveyAdminRecord[]>;
  createManaged(actorId: string, careerIds: readonly string[], input: SurveyAdminInput): Promise<SurveyAdminRecord>;
  updateManaged(actorId: string, careerIds: readonly string[], id: string, input: SurveyAdminPatch): Promise<SurveyAdminRecord>;
  publishManaged(actorId: string, careerIds: readonly string[], id: string): Promise<SurveyAdminRecord>;
  unpublishManaged(actorId: string, careerIds: readonly string[], id: string): Promise<SurveyAdminRecord>;
}
