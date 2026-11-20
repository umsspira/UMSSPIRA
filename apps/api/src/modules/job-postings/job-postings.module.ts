import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/infrastructure/database/prisma.module';
import { jobPostingsProviders } from './infrastructure/providers/job-postings.providers';
import { CreateJobPostingController } from './http/controllers/create-job-posting.controller';
import { ListAvailableJobPostingsController } from './http/controllers/list-available-job-postings.controller';
import { GetAvailableJobPostingController } from './http/controllers/get-available-job-posting.controller';
import { NlpModule } from '../nlp/nlp.module';
import { jobPostingAffinityProviders } from './infrastructure/providers/job-posting-affinity.providers';
import { CalculateJobPostingAffinity } from './application/use-cases/calculate-job-posting-affinity.use-case';
import { JOB_POSTING_AFFINITY_DATA } from './application/ports/job-posting-affinity-data.port';

@Module({
  imports: [PrismaModule, NlpModule],
  controllers: [
    CreateJobPostingController,
    ListAvailableJobPostingsController,
    GetAvailableJobPostingController,
  ],
  providers: [...jobPostingsProviders, ...jobPostingAffinityProviders],
  exports: [CalculateJobPostingAffinity, JOB_POSTING_AFFINITY_DATA],
})
export class JobPostingsModule {}
