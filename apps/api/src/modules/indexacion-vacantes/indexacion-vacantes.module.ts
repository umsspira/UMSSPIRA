import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';
import { PrismaModule } from '../../shared/infrastructure/database/prisma.module';
import { PrismaService } from '../../shared/infrastructure/database/prisma.service';
import { getJobPostingSearchConfig } from '../../shared/infrastructure/search/job-posting-search.config';
import {
  ELASTICSEARCH_CLIENT,
  ELASTICSEARCH_INDEX,
} from './indexacion-vacantes.constants';
import { IndexacionVacantesService } from './indexacion-vacantes.service';
import { PrismaVacanteIndexacionReader } from './prisma-vacante-indexacion.reader';
import { VacanteIndexacionCoordinator } from './vacante-indexacion.coordinator';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [],
  providers: [
    {
      provide: ELASTICSEARCH_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const { node, apiKey } = getJobPostingSearchConfig(config);

        return new Client({
          node,
          ...(apiKey ? { auth: { apiKey } } : {}),
          maxRetries: 2,
          requestTimeout: 5000,
        });
      },
    },
    {
      provide: ELASTICSEARCH_INDEX,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        getJobPostingSearchConfig(config).index,
    },
    IndexacionVacantesService,
    {
      provide: PrismaVacanteIndexacionReader,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) =>
        new PrismaVacanteIndexacionReader(prisma),
    },
    {
      provide: VacanteIndexacionCoordinator,
      inject: [
        PrismaVacanteIndexacionReader,
        IndexacionVacantesService,
        ConfigService,
      ],
      useFactory: (
        reader: PrismaVacanteIndexacionReader,
        indexador: IndexacionVacantesService,
        config: ConfigService,
      ) => new VacanteIndexacionCoordinator(reader, indexador, config),
    },
  ],
  exports: [VacanteIndexacionCoordinator],
})
export class IndexacionVacantesModule {}
