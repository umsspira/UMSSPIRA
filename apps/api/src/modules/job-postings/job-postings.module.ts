import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/infrastructure/database/prisma.module';
import { jobPostingsProviders } from './infrastructure/providers/job-postings.providers';
import { CreateJobPostingController } from './http/controllers/create-job-posting.controller';
import { GetTechnicalRequirementsController } from './http/controllers/get-technical-requirements.controller';
import { SaveTechnicalRequirementsController } from './http/controllers/save-technical-requirements.controller';
import { GetJobPostingController } from './http/controllers/get-job-posting.controller';

@Module({
  imports: [PrismaModule],
  controllers: [
    CreateJobPostingController,
    GetTechnicalRequirementsController,
    SaveTechnicalRequirementsController,
    GetJobPostingController,
  ],
  providers: jobPostingsProviders,
})
export class JobPostingsModule {}
