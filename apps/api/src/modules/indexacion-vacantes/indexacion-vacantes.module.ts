import { Module } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
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
      useFactory: () => {
        const node =
          process.env.ELASTICSEARCH_NODE || 'http://localhost:9200';
        const apiKey = process.env.ELASTICSEARCH_API_KEY;

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
      useFactory: () =>
        process.env.ELASTICSEARCH_INDEX_VACANTES || 'vacantes',
    },
    IndexacionVacantesService,
  ],
  exports: [IndexacionVacantesService],
})
export class IndexacionVacantesModule {}
