import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import type {
  AreaScoreRecord,
  RadarCalculationSnapshot,
  RadarRepositoryPort,
} from '../../application/ports/radar-repository.port';
import {
  normalizeKeywordContributions,
  normalizeTopKeywords,
} from '../../domain/policies/affinity-calculator';
import { DICTIONARY_VERSION } from '../../domain/policies/affinity-config';

type CalculateRadarRow = {
  id: string;
  id_titulado: string;
  hash_entrada: string | null;
  estado: string;
  version_algoritmo: string;
  version_diccionario?: string | null;
  fecha_calculo: Date;
};

type AfinidadRadarRow = {
  id_area: string;
  puntaje: unknown;
  porcentaje: unknown;
  palabras_clave_top: unknown;
  contribuciones_keyword?: unknown;
};

@Injectable()
export class PrismaRadarRepository implements RadarRepositoryPort {
  constructor(protected readonly prisma: PrismaService) {}

  /**
   * Cliente transaccional cuando el repositorio se usa dentro del bloqueo asesor.
   * El repositorio inyectable siempre trabaja sin transacción; la variante ligada
   * a una transacción se crea con `PrismaTransactionalRadarRepository`.
   */
  protected get transaction(): Prisma.TransactionClient | null {
    return null;
  }

  /** Toda lectura y escritura usa la transacción vigente si existe. */
  private get client(): Prisma.TransactionClient {
    return this.transaction ?? (this.prisma as unknown as Prisma.TransactionClient);
  }

  async getLatestCalculation(tituladoId: string): Promise<RadarCalculationSnapshot | null> {
    const calc = await this.client.calculoRadar.findFirst({
      where: { id_titulado: tituladoId },
      orderBy: { fecha_calculo: 'desc' },
    });

    if (!calc) {
      return null;
    }

    const afinidades = await this.client.afinidadRadar.findMany({
      where: { id_calculo_radar: calc.id },
    });

    return this.toSnapshot(calc, afinidades);
  }

  async getPreviousCalculation(
    tituladoId: string,
    currentCalculationId: string,
  ): Promise<RadarCalculationSnapshot | null> {
    const calc = await this.client.calculoRadar.findFirst({
      where: {
        id_titulado: tituladoId,
        id: { not: currentCalculationId },
      },
      orderBy: { fecha_calculo: 'desc' },
    });

    if (!calc) {
      return null;
    }

    const afinidades = await this.client.afinidadRadar.findMany({
      where: { id_calculo_radar: calc.id },
    });

    return this.toSnapshot(calc, afinidades);
  }

  async getUnmappedKeywords(tituladoId: string): Promise<string[]> {
    const rows = await this.client.palabraClaveNoMapeada.findMany({
      where: { id_titulado: tituladoId },
      select: { termino: true },
      orderBy: { termino: 'asc' },
    });

    return rows.map(({ termino }) => termino);
  }

  async executeWithAdvisoryLock<T>(
    tituladoId: string,
    operation: (repository: RadarRepositoryPort) => Promise<T>,
  ): Promise<T> {
    // Si ya estamos dentro de una transacción, se reutiliza para no abrir otra conexión
    // ni perder el bloqueo asesor, que es de alcance transaccional.
    if (this.transaction) {
      return operation(this);
    }

    return this.prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${tituladoId}))`;
      return operation(new PrismaTransactionalRadarRepository(this.prisma, transaction));
    });
  }

  async saveCalculation(params: {
    tituladoId: string;
    hashEntrada: string;
    estado: 'COMPLETADO' | 'VACIO';
    versionAlgoritmo: string;
    versionDiccionario?: string | null;
    areas: AreaScoreRecord[];
    unmapped: Array<{ term: string; count: number }>;
  }): Promise<RadarCalculationSnapshot> {
    if (this.transaction) {
      return this.persist(this.transaction, params);
    }

    return this.prisma.$transaction((transaction) => this.persist(transaction, params));
  }

  private async persist(
    transaction: Prisma.TransactionClient,
    params: {
      tituladoId: string;
      hashEntrada: string;
      estado: 'COMPLETADO' | 'VACIO';
      versionAlgoritmo: string;
      versionDiccionario?: string | null;
      areas: AreaScoreRecord[];
      unmapped: Array<{ term: string; count: number }>;
    },
  ): Promise<RadarCalculationSnapshot> {
    const versionDiccionario =
      params.versionDiccionario === undefined ? DICTIONARY_VERSION : params.versionDiccionario;

    const savedCalculation = await transaction.calculoRadar.create({
      data: {
        id_titulado: params.tituladoId,
        hash_entrada: params.hashEntrada,
        version_algoritmo: params.versionAlgoritmo,
        version_diccionario: versionDiccionario,
        estado: params.estado,
        fecha_calculo: new Date(),
      },
    });

    if (params.areas.length > 0) {
      await transaction.afinidadRadar.createMany({
        data: params.areas.map((area) => {
          const allContributions = area.contribucionesKeyword ?? area.palabrasClaveTop;
          return {
            id_calculo_radar: savedCalculation.id,
            id_area: area.areaId,
            puntaje: area.puntaje,
            porcentaje: area.porcentaje,
            palabras_clave_top: area.palabrasClaveTop as unknown as Prisma.InputJsonValue,
            contribuciones_keyword: allContributions as unknown as Prisma.InputJsonValue,
          };
        }),
      });
    }

    const currentUnmappedTerms = params.unmapped.map(({ term }) => term);
    await transaction.palabraClaveNoMapeada.deleteMany({
      where: {
        id_titulado: params.tituladoId,
        ...(currentUnmappedTerms.length > 0 ? { termino: { notIn: currentUnmappedTerms } } : {}),
      },
    });

    if (params.unmapped.length > 0) {
      // Una ida a PostgreSQL para todo el lote, conservando los IDs existentes.
      // Los valores son parámetros; ningún texto del perfil se interpola en SQL.
      const keywords = [
        ...new Map(params.unmapped.map((keyword) => [keyword.term, keyword])).values(),
      ];
      const payload = JSON.stringify(
        keywords.map((keyword) => ({
          termino: keyword.term,
          frecuencia: keyword.count,
        })),
      );
      await transaction.$executeRaw`
        INSERT INTO public.palabra_clave_no_mapeada
          (id_titulado, termino, frecuencia, fecha_deteccion)
        SELECT ${params.tituladoId}::uuid, keyword.termino, keyword.frecuencia, ${new Date()}
        FROM jsonb_to_recordset(${payload}::jsonb) AS keyword(termino text, frecuencia integer)
        ON CONFLICT (id_titulado, termino) DO UPDATE
        SET frecuencia = EXCLUDED.frecuencia, fecha_deteccion = EXCLUDED.fecha_deteccion
      `;
    }

    return {
      id: savedCalculation.id,
      tituladoId: savedCalculation.id_titulado,
      hashEntrada: savedCalculation.hash_entrada,
      estado: savedCalculation.estado as 'COMPLETADO' | 'VACIO',
      versionAlgoritmo: savedCalculation.version_algoritmo,
      versionDiccionario: savedCalculation.version_diccionario ?? versionDiccionario,
      fechaCalculo: savedCalculation.fecha_calculo,
      afinidad: params.areas.map((area) => ({
        areaId: area.areaId,
        puntaje: area.puntaje,
        porcentaje: area.porcentaje,
        ponderacion: area.ponderacion,
        palabrasClaveTop: area.palabrasClaveTop,
        contribucionesKeyword: area.contribucionesKeyword ?? area.palabrasClaveTop,
      })),
    };
  }

  private toSnapshot(
    calc: CalculateRadarRow,
    afinidades: AfinidadRadarRow[],
  ): RadarCalculationSnapshot {
    return {
      id: calc.id,
      tituladoId: calc.id_titulado,
      hashEntrada: calc.hash_entrada,
      estado: calc.estado as 'COMPLETADO' | 'VACIO',
      versionAlgoritmo: calc.version_algoritmo,
      versionDiccionario: calc.version_diccionario ?? null,
      fechaCalculo: calc.fecha_calculo,
      afinidad: afinidades.map((area) => {
        const palabrasClaveTop = normalizeTopKeywords(area.palabras_clave_top);
        const contribucionesKeyword =
          area.contribuciones_keyword !== undefined && area.contribuciones_keyword !== null
            ? normalizeKeywordContributions(area.contribuciones_keyword)
            : palabrasClaveTop;

        return {
          areaId: area.id_area,
          puntaje: Number(area.puntaje),
          porcentaje: Number(area.porcentaje),
          // La tabla afinidad_radar no guarda ponderacion: el armado del vector
          // la deriva del mayor peso conservado en palabras_clave_top.
          ponderacion: null,
          palabrasClaveTop,
          contribucionesKeyword,
        };
      }),
    };
  }
}

/**
 * Variante del repositorio ligada a una transacción abierta.
 * No se registra en el contenedor de Nest: solo la crea executeWithAdvisoryLock
 * para que todas las lecturas y escrituras compartan el mismo bloqueo asesor.
 */
class PrismaTransactionalRadarRepository extends PrismaRadarRepository {
  constructor(
    prisma: PrismaService,
    private readonly activeTransaction: Prisma.TransactionClient,
  ) {
    super(prisma);
  }

  protected override get transaction(): Prisma.TransactionClient {
    return this.activeTransaction;
  }
}