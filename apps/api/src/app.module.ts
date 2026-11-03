import { Module } from '@nestjs/common';
import { JobPostingsModule } from './modules/job-postings/job-postings.module';

@Module({
  imports: [JobPostingsModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
