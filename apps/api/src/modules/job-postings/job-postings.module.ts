
import { Module } from '@nestjs/common';

import { PrismaModule } from '../../shared/infrastructure/database/prisma.module';
import { VacantesModule } from '../vacantes/vacantes.module';
import { jobPostingsProviders } from './infrastructure/providers/job-postings.providers';
import { CreateJobPostingController } from './http/controllers/create-job-posting.controller';
import { GetPublishedJobPostingController } from './http/controllers/get-published-job-posting.controller';
import { ListPublishedJobPostingsController } from './http/controllers/list-published-job-postings.controller';
import { TechnicalRequirementsController } from './http/controllers/technical-requirements.controller';

@Module({
  imports: [PrismaModule, VacantesModule],
  controllers: [
    CreateJobPostingController,
    GetPublishedJobPostingController,
    ListPublishedJobPostingsController,
    TechnicalRequirementsController,
  ],
  providers: jobPostingsProviders,
})
export class JobPostingsModule {}
