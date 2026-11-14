import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getJobPostingSearchConfig } from '../../../shared/infrastructure/search/job-posting-search.config';
import {
  JOB_POSTING_PUBLISHED_STATES,
  JOB_POSTING_SEARCH_SCHEMA_VERSION,
  isPublishedJobPostingState,
  parseJobPostingSearchDocument,
} from '../../../shared/infrastructure/search/job-posting-search-document';
import type {
  ActiveJobPostingsResult,
  IndexedJobPosting,
  JobPostingsSearchOptions,
} from './job-postings-search.types';

// Limite conservador de esta API para paginacion from/size; no implementa paginacion profunda.
const MAX_SEARCH_WINDOW = 10_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readTotal(value: unknown): number {
  const total =
    isRecord(value) && value.relation === 'eq' ? value.value : value;
  if (typeof total !== 'number' || !Number.isSafeInteger(total) || total < 0) {
    throw new Error('La busqueda no devolvio un total exacto.');
  }
  return total;
}

function readResult(
  value: unknown,
  now: number,
  from: number,
  limit: number,
): ActiveJobPostingsResult {
  if (
    !isRecord(value) ||
    !isRecord(value.hits) ||
    !Array.isArray(value.hits.hits) ||
    (value.timed_out !== undefined && value.timed_out !== false)
  ) {
    throw new Error('Respuesta de busqueda incompleta.');
  }
  if (
    value._shards !== undefined &&
    (!isRecord(value._shards) || value._shards.failed !== 0)
  ) {
    throw new Error('Respuesta de busqueda parcial.');
  }
  const total = readTotal(value.hits.total);
  if (value.hits.hits.length !== Math.min(limit, Math.max(total - from, 0))) {
    throw new Error('La pagina no coincide con el total de busqueda.');
  }
  const data: IndexedJobPosting[] = [];
  const ids = new Set<string>();
  for (const hit of value.hits.hits) {
    if (!isRecord(hit)) {
      throw new Error('Resultado de busqueda invalido.');
    }
    const document = parseJobPostingSearchDocument(hit._source);
    if (
      hit._id !== document.id ||
      ids.has(document.id.toLowerCase()) ||
      !document.disponible ||
      !isPublishedJobPostingState(document.estado) ||
      (document.fecha_cierre !== null &&
        Date.parse(document.fecha_cierre) <= now)
    ) {
      throw new Error(
        'El resultado no cumple la consulta de vacantes vigentes.',
      );
    }
    ids.add(document.id.toLowerCase());
    data.push(document);
  }
  // No se descartan ni deduplican filas despues de paginar: ante inconsistencias falla toda la consulta.
  return { data, total };
}

@Injectable()
export class JobPostingsSearchService {
  private readonly logger = new Logger(JobPostingsSearchService.name);

  constructor(private readonly configService: ConfigService) {}

  async findActive(
    options: JobPostingsSearchOptions = {},
    now: Date = new Date(),
  ): Promise<ActiveJobPostingsResult> {
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
      throw new BadRequestException('Parametros de busqueda invalidos.');
    }
    const page = options.page === undefined ? 1 : options.page;
    const limit = options.limit === undefined ? 10 : options.limit;
    const from = (page - 1) * limit;
    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 100 ||
      !Number.isSafeInteger(from) ||
      from + limit > MAX_SEARCH_WINDOW
    ) {
      throw new BadRequestException(
        'Paginacion invalida: page entero positivo, limit entre 1 y 100 y ventana maxima de 10000.',
      );
    }
    if (options.search !== undefined && typeof options.search !== 'string') {
      throw new BadRequestException(
        'El texto de busqueda debe ser una cadena.',
      );
    }
    if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
      throw new BadRequestException('El instante de busqueda debe ser valido.');
    }
    const referenceTime = now.getTime();
    const search = options.search?.trim();
    const query = {
      track_total_hits: true,
      from,
      size: limit,
      query: {
        bool: {
          filter: [
            { term: { schema_version: JOB_POSTING_SEARCH_SCHEMA_VERSION } },
            { term: { disponible: true } },
            { terms: { estado: JOB_POSTING_PUBLISHED_STATES } },
            {
              bool: {
                should: [
                  {
                    bool: { must_not: [{ exists: { field: 'fecha_cierre' } }] },
                  },
                  {
                    range: {
                      fecha_cierre: {
                        gt: new Date(referenceTime).toISOString(),
                      },
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
          ],
          ...(search
            ? {
                must: [
                  {
                    multi_match: {
                      query: search,
                      fields: ['titulo^3', 'razon_social^2'],
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
            missing: '_last',
            unmapped_type: 'date',
          },
        },
        { id: { order: 'asc' } },
      ],
    };

    try {
      const { node, index, apiKey } = getJobPostingSearchConfig(
        this.configService,
      );
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) {
        headers.Authorization = `ApiKey ${apiKey}`;
      }
      const response = await fetch(
        `${node}/${encodeURIComponent(index)}/_search`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(query),
          signal: AbortSignal.timeout(10000),
        },
      );
      if (!response.ok) {
        throw new Error(
          `Elasticsearch respondio con estado ${response.status}`,
        );
      }
      const result: unknown = await response.json();
      return readResult(result, referenceTime, from, limit);
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
