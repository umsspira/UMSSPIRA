import { MODULE_METADATA } from '@nestjs/common/constants';
import { GetMySurveyController } from './http/controllers/get-my-survey.controller';
import { GetSurveyReportController } from './http/controllers/get-survey-report.controller';
import { ManageSurveysController } from './http/controllers/manage-surveys.controller';
import { SubmitSurveyController } from './http/controllers/submit-survey.controller';
import { SURVEY_REPOSITORY_PORT } from './infrastructure/providers/surveys.providers';
import { SurveysModule } from './surveys.module';

describe('SurveysModule', () => {
  it('registra los controladores de encuestas', () => {
    expect(Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, SurveysModule)).toEqual([
      SubmitSurveyController,
      GetSurveyReportController,
      GetMySurveyController,
      ManageSurveysController,
    ]);
  });

  it('expone el repositorio de encuestas a otros módulos', () => {
    const exported = Reflect.getMetadata(MODULE_METADATA.EXPORTS, SurveysModule) as Array<{
      provide?: unknown;
    }>;

    expect(exported.some((provider) => provider.provide === SURVEY_REPOSITORY_PORT)).toBe(true);
  });
});