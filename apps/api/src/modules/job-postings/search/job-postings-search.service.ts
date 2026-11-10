
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import {
  ActiveJobPostingsResult,
  IndexedJobPosting,
  JobPostingsSearchOptions,
} from './job-postings-search.types';

type ElasticsearchSearchResponse = {
  hits?: {
    hits?: Array<{
      _id?: string;
      _source?: Partial<IndexedJobPosting>;
    }>;
    total?: number | {
      value: number;
    };
  };
};

@Injectable()
export class JobPostingsSearchService {
  private readonly logger = new Logger(
    JobPostingsSearchService.name,
  );

  constructor(
    private readonly configService: ConfigService,
  ) {}

  async findActive(
    options: JobPostingsSearchOptions = {},
  ): Promise<ActiveJobPostingsResult> {
    const node = this.configService.get<string>(
      'ELASTICSEARCH_NODE',
    );

    const index = this.configService.get<string>(
      'ELASTICSEARCH_INDEX',
    );

    if (!node || !index) {
      throw new ServiceUnavailableException(
        'El servicio de búsqueda no está configurado.',
      );
    }

    const page = Math.max(1, Math.floor(Number(options.page) || 1));

    const limit = Math.min(
      100,
      Math.max(1, Math.floor(Number(options.limit) || 10)),
    );

    const search = options.search?.trim();
    const from = (page - 1) * limit;

    const query = {
      track_total_hits: true,
      from,
      size: limit,
      query: {
        bool: {
          filter: [
            {
              term: {
                disponible: true,
              },
            },
          ],
          ...(search
            ? {
                must: [
                  {
                    multi_match: {
                      query: search,
                      fields: [
                        'titulo^3',
                        'razon_social^2',
                      ],
                      fuzziness: 'AUTO',
                    },
                  },
                ],
              }
            : {}),
        },
      },
      sort: [
        {
          created_at: {
            order: 'desc',
            unmapped_type: 'date',
          },
        },
      ],
    };

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      const apiKey = this.configService.get<string>(
        'ELASTICSEARCH_API_KEY',
      );

      if (apiKey) {
        headers.Authorization = `ApiKey ${apiKey}`;
      }

      const response = await fetch(
        `${node.replace(/\/$/, '')}/${encodeURIComponent(index)}/_search`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(query),
          signal: AbortSignal.timeout(10000),
        },
      );

      if (!response.ok) {
        throw new Error(
          `Elasticsearch respondió con estado ${response.status}`,
        );
      }

      const result =
        (await response.json()) as ElasticsearchSearchResponse;

      const hits = result.hits?.hits ?? [];

      const uniqueVacancies = new Map<string, IndexedJobPosting>();

      for (const hit of hits) {
        const source = hit._source;

        if (!source || source.disponible !== true) {
          continue;
        }

        const id = source.id ?? hit._id;

        if (!id || uniqueVacancies.has(id)) {
          continue;
        }

        uniqueVacancies.set(id, {
          id,
          titulo: source.titulo ?? null,
          id_empresa: source.id_empresa ?? null,
          razon_social: source.razon_social ?? null,
          disponible: true,
          created_at: source.created_at ?? null,
        });
      }

      const total =
        typeof result.hits?.total === 'number'
          ? result.hits.total
          : result.hits?.total?.value ?? 0;

      return {
        data: Array.from(uniqueVacancies.values()),
        total,
      };
    } catch (error) {
      this.logger.error(
        'Error al consultar las vacantes activas.',
        error instanceof Error ? error.stack : String(error),
      );

      throw new ServiceUnavailableException(
        'No fue posible consultar las vacantes. Intenta nuevamente.',
      );
    }
  }
}
