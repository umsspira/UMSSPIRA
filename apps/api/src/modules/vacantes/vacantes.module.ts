import { Module } from '@nestjs/common';
import { VacantesService } from './vacantes.service';
import { VacantesController } from './vacantes.controller';
import { PrismaModule } from '../../shared/infrastructure/database/prisma.module';
import { VacancySearchIndexerService } from './vacancy-search-indexer.service';

@Module({
  imports: [PrismaModule],
  controllers: [VacantesController],
  providers: [VacantesService, VacancySearchIndexerService],
})
export class VacantesModule {}