import { Module } from '@nestjs/common';
import { TechnicalRequirementsController } from './technical-requirements.controller';

@Module({
  controllers: [TechnicalRequirementsController],
})
export class JobPostingsModule {}
