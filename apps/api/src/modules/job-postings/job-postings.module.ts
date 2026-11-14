
import { Module } from '@nestjs/common';

import { PrismaModule } from '../../shared/infrastructure/database/prisma.module';
import { jobPostingsProviders } from './infrastructure/providers/job-postings.providers';
import { CreateJobPostingController } from './http/controllers/create-job-posting.controller';
import { GetTechnicalRequirementsController } from './http/controllers/get-technical-requirements.controller';
import { SaveTechnicalRequirementsController } from './http/controllers/save-technical-requirements.controller';
import { GetPublishedJobPostingController } from './http/controllers/get-published-job-posting.controller';
import { ListPublishedJobPostingsController } from './http/controllers/list-published-job-postings.controller';

@Module({
  imports: [PrismaModule],
  controllers: [
    CreateJobPostingController,
    GetTechnicalRequirementsController,
    SaveTechnicalRequirementsController,
    GetPublishedJobPostingController,
    ListPublishedJobPostingsController,
  ],
  providers: jobPostingsProviders,
})
export class JobPostingsModule {}
