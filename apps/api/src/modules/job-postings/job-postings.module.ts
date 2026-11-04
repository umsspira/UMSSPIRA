import { Module } from '@nestjs/common';
import { TechnicalRequirementsController } from './technical-requirements.controller';
import { JobPostingAffinityController } from './controllers/job-posting-affinity.controller';
import { JobPostingAffinityService } from './services/job-posting-affinity.service';
import { NlpMatcherService } from './services/nlp-matcher.service';

@Module({
  controllers: [
    TechnicalRequirementsController,
    JobPostingAffinityController,
  ],
  providers: [
    JobPostingAffinityService,
    NlpMatcherService,
  ],
  exports: [
    JobPostingAffinityService,
    NlpMatcherService,
  ],
})
export class JobPostingsModule {}
