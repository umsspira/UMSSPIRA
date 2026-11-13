import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { BusinessRuleError } from '../../../../shared/errors/business-rule-error';
import type { ReportRepository } from '../../application/ports/report-repository.port';
import type {
  CompetencyHeatmap,
  GraduateListQuery,
  ReportFilter,
} from '../../application/contracts/report-inputs';
import { reportInclude, toGraduateReport } from '../translators/report.translator';
import {
  AFFINITY_AREAS,
  AFFINITY_AREA_SHORT_LABELS,
  RADAR_AREA_IDS,
} from '@umsspira/shared-types';

export const MAX_EXPORT_ROWS = 10000;

@Injectable()
export class PrismaReportRepository implements ReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async metrics(careerIds: readonly string[]) {
    const [totalApplications, approvedApplications, observedApplications, activeMentors] =
      await this.prisma.$transaction(
        [
          this.prisma.solicitud.count({
            where: { detalle_solicitud: { id_carrera: { in: [...careerIds] } } },
          }),
          this.prisma.solicitud.count({
            where: {
              estado: 'APROBADA',
              detalle_solicitud: { id_carrera: { in: [...careerIds] } },
            },
          }),
          this.prisma.solicitud.count({
            where: {
              estado: 'OBSERVADA',
              detalle_solicitud: { id_carrera: { in: [...careerIds] } },
            },
          }),
          this.prisma.mentor.count({
            where: {
              esta_activo: true,
              titulado: {
                id_carrera: { in: [...careerIds] },
                usuario: { estado: 'ACTIVO', rol: 'titulado' },
              },
            },
          }),
        ],
        { isolationLevel: 'RepeatableRead' },
      );
    return { totalApplications, approvedApplications, observedApplications, activeMentors };
  }

  async competencyHeatmap(careerIds: readonly string[]): Promise<CompetencyHeatmap> {
    // Integración T2.2/T2.3: esta consulta entrega el contrato completo del
    // mapa; radar solo es la fuente de cálculos y no se modifica desde reports.
    const calculations = await this.prisma.calculoRadar.findMany({
      where: {
        titulado: {
          id_carrera: { in: [...careerIds] },
          anio_egreso: { not: null },
        },
      },
      orderBy: [{ id_titulado: 'asc' }, { fecha_calculo: 'desc' }, { id: 'desc' }],
      distinct: ['id_titulado'],
      include: {
        titulado: { select: { id: true, anio_egreso: true } },
        afinidad_registros: {
          include: { area: { select: { id: true, nombre: true } } },
        },
      },
    });

    const latestByGraduate = new Map<string, (typeof calculations)[number]>();
    for (const calculation of calculations) {
      if (!latestByGraduate.has(calculation.id_titulado)) {
        latestByGraduate.set(calculation.id_titulado, calculation);
      }
    }

    const areas = AFFINITY_AREAS.map((area) => ({
      id: RADAR_AREA_IDS[area],
      name: AFFINITY_AREA_SHORT_LABELS[area],
    }));
    const cohortMap = new Map<string, Map<string, { total: number; sum: number }>>();
    let updatedAt: Date | null = null;

    for (const calculation of latestByGraduate.values()) {
      if (!updatedAt || calculation.fecha_calculo > updatedAt) {
        updatedAt = calculation.fecha_calculo;
      }
      const cohort = String(calculation.titulado.anio_egreso ?? 'Sin cohorte');
      const cohortCells = cohortMap.get(cohort) ?? new Map();
      cohortMap.set(cohort, cohortCells);

      for (const affinity of calculation.afinidad_registros) {
        const area = {
          id: affinity.area.id,
          name: affinity.area.nombre ?? 'Área sin nombre',
        };
        const current = cohortCells.get(area.id) ?? { total: 0, sum: 0 };
        current.total += 1;
        current.sum += Number(affinity.porcentaje);
        cohortCells.set(area.id, current);
      }
    }

    const cohorts = [...cohortMap.keys()].sort();
    const cells = cohorts.flatMap((cohort) =>
      areas.map((area) => {
        const value = cohortMap.get(cohort)?.get(area.id);
        const graduateCount = value?.total ?? 0;
        const base = {
          cohort,
          areaId: area.id,
          areaName: area.name,
        };
        if (graduateCount === 0) return { ...base, status: 'no-data' as const };
        if (graduateCount < 5) return { ...base, status: 'insufficient' as const };
        return {
          ...base,
          status: 'ok' as const,
          graduateCount,
          percentage: Number((value!.sum / graduateCount).toFixed(2)),
        };
      }),
    );

    return { areas, cohorts, cells, updatedAt };
  }

  async list(careerIds: readonly string[], query: GraduateListQuery) {
    return this.prisma.$transaction(
      async (tx) => {
        const where = await this.filters(tx, careerIds, query);
        const total = await tx.solicitud.count({ where });
        const rows = await tx.solicitud.findMany({
          where,
          include: reportInclude,
          orderBy: [{ fecha_creacion: 'desc' }, { id: 'asc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        });
        return { records: rows.map(toGraduateReport), total, page: query.page, limit: query.limit };
      },
      { isolationLevel: 'RepeatableRead', timeout: 20000 },
    );
  }

  async exportData(careerIds: readonly string[], filter: ReportFilter) {
    return this.prisma.$transaction(
      async (tx) => {
        const where = await this.filters(tx, careerIds, filter);
        const rows = await tx.solicitud.findMany({
          where,
          include: reportInclude,
          orderBy: [{ fecha_creacion: 'desc' }, { id: 'asc' }],
          take: MAX_EXPORT_ROWS + 1,
        });
        if (rows.length > MAX_EXPORT_ROWS) {
          throw new BusinessRuleError(
            'invalid',
            'REPORT_TOO_LARGE',
            'Reduce los filtros: cada exportación admite hasta 10000 registros',
          );
        }
        const careers = await tx.carrera.findMany({
          where: { id: { in: [...careerIds] } },
          select: { nombre: true },
          orderBy: { nombre: 'asc' },
        });
        return {
          records: rows.map(toGraduateReport),
          careerNames: careers.map((career) => career.nombre ?? ''),
        };
      },
      { isolationLevel: 'RepeatableRead', timeout: 30000 },
    );
  }

  private async filters(
    tx: Prisma.TransactionClient,
    careerIds: readonly string[],
    filter: ReportFilter,
  ): Promise<Prisma.SolicitudWhereInput> {
    const base = { id_carrera: { in: [...careerIds] } };
    // Task 4.4: se busca por palabras (sin importar orden, comas ni espacios repetidos).
    const tokens = (filter.search ?? '').split(/[\s,;]+/).filter(Boolean);
    if (!tokens.length) {
      return { ...(filter.status ? { estado: filter.status } : {}), detalle_solicitud: base };
    }
    const conditions: Prisma.DetalleSolicitudWhereInput[] = [];
    for (const term of tokens) {
      // SIS es NUMERIC en el esquema original: la búsqueda parcial requiere convertirlo a texto.
      // Los valores y las carreras se parametrizan mediante Prisma, nunca se interpolan como SQL.
      const sis =
        /^[0-9]+$/.test(term) && careerIds.length
          ? await tx.$queryRaw<
              { id: string }[]
            >`SELECT id FROM detalle_solicitud WHERE id_carrera IN (${Prisma.join(careerIds.map((id) => Prisma.sql`${id}::uuid`))}) AND cod_sis::text LIKE ${'%' + term + '%'}`
          : [];
      conditions.push({
        OR: [
          { nombre: { contains: term, mode: 'insensitive' } },
          { apellido: { contains: term, mode: 'insensitive' } },
          { email: { contains: term, mode: 'insensitive' } },
          { ci: { contains: term } },
          ...(sis.length ? [{ id: { in: sis.map((row) => row.id) } }] : []),
        ],
      });
    }
    return {
      ...(filter.status ? { estado: filter.status } : {}),
      detalle_solicitud: { ...base, AND: conditions },
    };
  }
}
