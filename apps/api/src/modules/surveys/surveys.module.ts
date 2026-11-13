import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/infrastructure/database/prisma.module';
import { AuthModule } from '../auth/auth.module';

import { SubmitSurveyController } from './http/controllers/submit-survey.controller';
import { GetSurveyReportController } from './http/controllers/get-survey-report.controller';
import { GetMySurveyController } from './http/controllers/get-my-survey.controller';
import { ManageSurveysController } from './http/controllers/manage-surveys.controller';
import { surveysProviders } from './infrastructure/providers/surveys.providers';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [
    SubmitSurveyController,
    GetSurveyReportController,
    GetMySurveyController,
    ManageSurveysController,
  ],
  providers: [...surveysProviders],
  exports: [...surveysProviders],
})
export class SurveysModule {}
