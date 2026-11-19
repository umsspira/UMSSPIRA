import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/infrastructure/database/prisma.module';
import { jobPostingsProviders } from './infrastructure/providers/job-postings.providers';
import { CreateJobPostingController } from './http/controllers/create-job-posting.controller';
import { ListAvailableJobPostingsController } from './http/controllers/list-available-job-postings.controller';
import { GetAvailableJobPostingController } from './http/controllers/get-available-job-posting.controller';

@Module({
  imports: [PrismaModule],
  controllers: [
    CreateJobPostingController,
    ListAvailableJobPostingsController,
    GetAvailableJobPostingController,
  ],
  providers: jobPostingsProviders,
})
export class JobPostingsModule {}
