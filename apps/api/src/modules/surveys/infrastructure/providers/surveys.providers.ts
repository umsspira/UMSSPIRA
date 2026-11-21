import { Provider } from '@nestjs/common';
import { PrismaSurveyRepository } from '../repositories/prisma-survey.repository';
import { UpdateMySurveyUseCase } from '../../application/use-cases/update-my-survey.use-case';
import type { SurveyRepositoryPort } from '../../application/ports/survey-repository.port';

export const SURVEY_REPOSITORY_PORT = 'SURVEY_REPOSITORY_PORT';

export const surveysProviders: Provider[] = [
  {
    provide: SURVEY_REPOSITORY_PORT,
    useClass: PrismaSurveyRepository,
  },
  {
    provide: UpdateMySurveyUseCase,
    inject: [SURVEY_REPOSITORY_PORT],
    useFactory: (repository: SurveyRepositoryPort) => new UpdateMySurveyUseCase(repository),
  },
];