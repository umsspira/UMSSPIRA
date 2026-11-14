import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import {
  toJobPostingSearchDocument,
  type JobPostingSearchDocument,
} from '../../shared/infrastructure/search/job-posting-search-document';
import {
  ELASTICSEARCH_CLIENT,
  ELASTICSEARCH_INDEX,
} from './indexacion-vacantes.constants';
import type { VacanteIndexable } from './interfaces/vacante-indexable.interface';

@Injectable()
export class IndexacionVacantesService {
  private readonly logger = new Logger(IndexacionVacantesService.name);

  constructor(
    @Inject(ELASTICSEARCH_CLIENT) private readonly client: Client,
    @Inject(ELASTICSEARCH_INDEX) private readonly indexName: string,
  ) {}

  /** Construccion aislada, sin consultas ni indexacion; usa la politica compartida con HU8. */
  construirDocumento(
    vacante: VacanteIndexable,
    ahora: Date,
  ): JobPostingSearchDocument {
    if (!vacante || typeof vacante !== 'object') {
      throw new BadRequestException(
        'Debes enviar los datos oficiales de una vacante.',
      );
    }

    try {
      return toJobPostingSearchDocument(vacante, ahora);
    } catch (error) {
      if (error instanceof TypeError || error instanceof RangeError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  /**
   * Crea el índice si aún no existe. Si dos peticiones intentan crearlo
   * simultáneamente, se acepta que una de ellas encuentre el índice creado.
   */
  async asegurarIndice(): Promise<void> {
    try {
      const existe = await this.client.indices.exists({
        index: this.indexName,
      });
      if (existe) {
        return;
      }

      try {
        await this.client.indices.create({
          index: this.indexName,
          mappings: {
            properties: {
              schema_version: { type: 'integer' },
              id: { type: 'keyword' },
              titulo: { type: 'text' },
              id_empresa: { type: 'keyword' },
              razon_social: { type: 'text' },
              estado: { type: 'keyword' },
              disponible: { type: 'boolean' },
              created_at: {
                type: 'date',
                format: 'strict_date_optional_time||epoch_millis',
              },
              fecha_cierre: {
                type: 'date',
                format: 'strict_date_optional_time||epoch_millis',
              },
            },
          },
        });
      } catch (error) {
        // Evita fallar si otra instancia creó el índice entre exists y create.
        const tipoError =
          error && typeof error === 'object'
            ? (
                error as {
                  meta?: { body?: { error?: { type?: string } } };
                }
              ).meta?.body?.error?.type
            : undefined;

        if (tipoError !== 'resource_already_exists_exception') {
          throw error;
        }
      }
    } catch (error) {
      this.logger.error(
        'No fue posible preparar el índice de vacantes.',
        error,
      );
      throw new ServiceUnavailableException(
        'No se pudo preparar el índice en Elasticsearch. Verifica que el servicio esté disponible.',
      );
    }
  }

  /**
   * Indexar con un _id determinista hace que una segunda indexación de la
   * misma vacante actualice el documento existente en lugar de duplicarlo.
   */
  async indexarVacante(vacante: VacanteIndexable, ahora: Date = new Date()) {
    const documento = this.construirDocumento(vacante, ahora);
    await this.asegurarIndice();

    try {
      const respuesta = await this.client.index({
        index: this.indexName,
        id: documento.id,
        document: documento,
        refresh: 'wait_for',
      });

      return {
        idVacante: documento.id,
        idDocumento: respuesta._id,
        indice: respuesta._index,
        resultado: respuesta.result,
      };
    } catch (error) {
      this.logger.error(`Error indexando la vacante ${vacante.id}.`, error);
      throw new ServiceUnavailableException(
        'No se pudo indexar la vacante en Elasticsearch.',
      );
    }
  }

  async verificarConexion() {
    try {
      const respuesta = await this.client.ping();
      return {
        conectado: Boolean(respuesta),
        indice: this.indexName,
      };
    } catch {
      throw new ServiceUnavailableException(
        'No se pudo establecer conexión con Elasticsearch.',
      );
    }
  }
}
