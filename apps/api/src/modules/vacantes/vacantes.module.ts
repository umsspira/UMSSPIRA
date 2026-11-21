import { Module } from '@nestjs/common';
import { VacantesService } from './vacantes.service';
import { VacantesController } from './vacantes.controller';
import { PrismaModule } from '../../shared/infrastructure/database/prisma.module';
import { JobPostingsModule } from '../job-postings/job-postings.module';

@Module({
  imports: [PrismaModule, JobPostingsModule],
  controllers: [VacantesController],
  providers: [VacantesService],
})
export class VacantesModule {}
