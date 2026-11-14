import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../shared/infrastructure/database/prisma.module';
import { ElasticsearchService } from './indexacion/elasticsearch.service';
import { VacantesIndexService } from './indexacion/vacantes-index.service';
import { PrismaRequisitosTecnicosRepository } from './prisma-requisitos-tecnicos.repository';
import { RequisitosTecnicosService } from './requisitos-tecnicos.service';
import { REQUISITOS_TECNICOS_REPOSITORY } from './requisitos-tecnicos.repository';
import { VacantesController } from './vacantes.controller';
import { VacantesEstructuraService } from './vacantes-estructura.service';
import { VacantesService } from './vacantes.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [VacantesController],
  providers: [
    VacantesService,
    VacantesEstructuraService,
    RequisitosTecnicosService,
    {
      provide: REQUISITOS_TECNICOS_REPOSITORY,
      useClass: PrismaRequisitosTecnicosRepository,
    },
    ElasticsearchService,
    VacantesIndexService,
  ],
  exports: [
    VacantesService,
    VacantesEstructuraService,
    RequisitosTecnicosService,
  ],
})
export class VacantesModule {}
