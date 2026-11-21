import type { SubmitSurveyInput } from '../contracts/submit-survey.input';
import type { SurveyRepositoryPort } from '../ports/survey-repository.port';

export class UpdateMySurveyUseCase {
  constructor(
    private readonly repository: SurveyRepositoryPort,
  ) {}

  execute(input: SubmitSurveyInput) {
    return this.repository.updateOnce(input);
  }
}
