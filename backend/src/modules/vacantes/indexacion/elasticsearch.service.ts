import { Client } from '@elastic/elasticsearch';
import {
  Inject,
  Injectable,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  VACANCY_INDEX_MAPPINGS,
  type VacancyIndexDocument,
} from './vacancy-index.types';

export const ELASTICSEARCH_CLIENT = Symbol('ELASTICSEARCH_CLIENT');

@Injectable()
export class ElasticsearchService {
  private client?: Client;

  constructor(
    private readonly configService: ConfigService,
    @Optional()
    @Inject(ELASTICSEARCH_CLIENT)
    client?: Client,
  ) {
    this.client = client;
  }

  get indexName() {
    return (
      this.configService.get<string>('ELASTICSEARCH_INDEX_VACANTES')?.trim() ||
      'vacantes'
    );
  }

  async ensureVacancyIndex() {
    try {
      const client = this.getClient();
      const exists = await client.indices.exists({ index: this.indexName });

      if (!exists) {
        await client.indices.create({
          index: this.indexName,
          mappings: VACANCY_INDEX_MAPPINGS,
        });
      }
    } catch (error) {
      this.throwControlledError(error);
    }
  }

  async indexVacancy(document: VacancyIndexDocument) {
    await this.ensureVacancyIndex();

    try {
      await this.getClient().index({
        index: this.indexName,
        id: document.id,
        document,
        refresh: 'wait_for',
      });

      return this.indexName;
    } catch (error) {
      this.throwControlledError(error);
    }
  }

  async searchVacancies(query: string) {
    await this.ensureVacancyIndex();
    const normalizedQuery = query.trim();

    try {
      const response = await this.getClient().search<VacancyIndexDocument>({
        index: this.indexName,
        size: 100,
        query: normalizedQuery
          ? {
              bool: {
                should: [
                  { term: { id: normalizedQuery } },
                  {
                    match: {
                      titulo: { query: normalizedQuery, operator: 'and' },
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            }
          : { match_all: {} },
      });

      return response.hits.hits.flatMap((hit) =>
        hit._source ? [hit._source] : [],
      );
    } catch (error) {
      this.throwControlledError(error);
    }
  }

  private getClient() {
    if (this.client) return this.client;

    const node = this.configService
      .get<string>('ELASTICSEARCH_NODE')
      ?.trim();

    if (!node) {
      throw new ServiceUnavailableException(
        'El servicio de búsqueda no está configurado.',
      );
    }

    const apiKey = this.configService
      .get<string>('ELASTICSEARCH_API_KEY')
      ?.trim();

    this.client = new Client({
      node,
      ...(apiKey ? { auth: { apiKey } } : {}),
    });

    return this.client;
  }

  private throwControlledError(error: unknown): never {
    if (error instanceof ServiceUnavailableException) throw error;

    throw new ServiceUnavailableException(
      'El servicio de búsqueda no está disponible temporalmente.',
    );
  }
}
