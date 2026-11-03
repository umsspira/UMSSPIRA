import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import {
  ELASTICSEARCH_CLIENT,
  ELASTICSEARCH_INDEX,
} from './indexacion-vacantes.constants';
import { VacanteIndexable } from './interfaces/vacante-indexable.interface';

@Injectable()
export class IndexacionVacantesService {
  private readonly logger = new Logger(IndexacionVacantesService.name);

  constructor(
    @Inject(ELASTICSEARCH_CLIENT) private readonly client: Client,
    @Inject(ELASTICSEARCH_INDEX) private readonly indexName: string,
  ) {}

  /**
   * Crea el índice si aún no existe. Si dos peticiones intentan crearlo
   * simultáneamente, se acepta que una de ellas encuentre el índice creado.
   */
  async asegurarIndice(): Promise<void> {
    try {
      const existe = await this.client.indices.exists({ index: this.indexName });
      if (existe) return;

      try {
        await this.client.indices.create({
          index: this.indexName,
          mappings: {
            properties: {
              id: { type: 'keyword' },
              titulo: { type: 'text' },
              descripcion: { type: 'text' },
              empresa: { type: 'text' },
              ubicacion: { type: 'text' },
              modalidad: { type: 'keyword' },
              tipoContrato: { type: 'keyword' },
              fechaPublicacion: { type: 'date', format: 'strict_date_optional_time||epoch_millis' },
              estado: { type: 'keyword' },
              requerimientosLaborales: {
                type: 'nested',
                properties: {
                  id: { type: 'keyword' },
                  nombre: { type: 'text' },
                  tipo: { type: 'keyword' },
                  nivel: { type: 'keyword' },
                },
              },
            },
          },
        });
      } catch (error) {
        // Evita fallar si otra instancia creó el índice entre exists y create.
        if (error?.meta?.body?.error?.type !== 'resource_already_exists_exception') {
          throw error;
        }
      }
    } catch (error) {
      this.logger.error('No fue posible preparar el índice de vacantes.', error);
      throw new ServiceUnavailableException(
        'No se pudo preparar el índice en Elasticsearch. Verifica que el servicio esté disponible.',
      );
    }
  }

  /**
   * Indexar con un _id determinista hace que una segunda indexación de la
   * misma vacante actualice el documento existente en lugar de duplicarlo.
   */
  async indexarVacante(vacante: VacanteIndexable) {
    this.validarVacante(vacante);
    await this.asegurarIndice();

    try {
      const respuesta = await this.client.index({
        index: this.indexName,
        id: vacante.id,
        document: {
          ...vacante,
          id: vacante.id,
          requerimientosLaborales: vacante.requerimientosLaborales ?? [],
        },
        refresh: 'wait_for',
      });

      return {
        idVacante: vacante.id,
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

  private validarVacante(vacante: VacanteIndexable): void {
    if (!vacante || typeof vacante !== 'object') {
      throw new BadRequestException('Debes enviar los datos de una vacante.');
    }

    if (typeof vacante.id !== 'string' || !vacante.id.trim()) {
      throw new BadRequestException('La vacante debe tener un id válido.');
    }

    for (const campo of ['titulo', 'descripcion', 'empresa'] as const) {
      if (typeof vacante[campo] !== 'string' || !vacante[campo].trim()) {
        throw new BadRequestException(`El campo ${campo} es obligatorio.`);
      }
    }

    if (
      vacante.requerimientosLaborales !== undefined &&
      !Array.isArray(vacante.requerimientosLaborales)
    ) {
      throw new BadRequestException(
        'requerimientosLaborales debe ser un arreglo.',
      );
    }
  }
}
