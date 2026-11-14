import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';
import { getJobPostingSearchConfig } from '../../shared/infrastructure/search/job-posting-search.config';
import {
  ELASTICSEARCH_CLIENT,
  ELASTICSEARCH_INDEX,
} from './indexacion-vacantes.constants';
import { IndexacionVacantesController } from './indexacion-vacantes.controller';
import { IndexacionVacantesService } from './indexacion-vacantes.service';

@Module({
  controllers: [IndexacionVacantesController],
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
  ],
  exports: [IndexacionVacantesService],
})
export class IndexacionVacantesModule {}
