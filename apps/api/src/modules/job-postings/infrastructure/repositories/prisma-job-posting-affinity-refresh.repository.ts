import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { JobPostingAffinityResult } from '@umsspira/shared-types';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { PrismaJobPostingAffinityDataAdapter } from '../adapters/prisma-job-posting-affinity-data.adapter';
import { jobPostingAffinityInputHash } from '../../domain/policies/job-posting-affinity-input-hash';
import type { AffinityApplication, JobPostingAffinityRefreshPort } from '../../application/ports/job-posting-affinity-refresh.port';

const selection = {
  id: true, id_usuario: true, id_vacante: true, hash_entrada: true, estado_match: true,
} as const;

function toApplication(row: {
  id: string; id_usuario: string | null; id_vacante: string | null;
  hash_entrada: string | null; estado_match: string | null;
}): AffinityApplication | null {
  if (!row.id_usuario || !row.id_vacante) {return null;}
  return {
    id: row.id, userId: row.id_usuario, vacancyId: row.id_vacante,
    inputHash: row.hash_entrada, matchStatus: row.estado_match,
  };
}

@Injectable()
export class PrismaJobPostingAffinityRefreshRepository implements JobPostingAffinityRefreshPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly data: PrismaJobPostingAffinityDataAdapter,
  ) {}

  async listForUser(userId: string, offset: number, limit: number): Promise<AffinityApplication[]> {
    const rows = await this.prisma.postulacion.findMany({
      where: { id_usuario: userId, id_vacante: { not: null } },
      orderBy: { id: 'asc' }, skip: offset, take: limit, select: selection,
    });
    return rows.flatMap((row) => toApplication(row) ?? []);
  }

  async listForVacancy(vacancyId: string, companyUserId: string, offset: number, limit: number): Promise<AffinityApplication[]> {
    const rows = await this.prisma.postulacion.findMany({
      where: { id_vacante: vacancyId, id_usuario: { not: null }, vacante: { empresa: {
        OR: [{ id_usuario: companyUserId }, { empresa_usuario_registros: { some: { id_usuario: companyUserId, estado: 'activo' } } }],
      } } },
      orderBy: { id: 'asc' }, skip: offset, take: limit, select: selection,
    });
    return rows.flatMap((row) => toApplication(row) ?? []);
  }

  async listOne(vacancyId: string, companyUserId: string, applicationId: string): Promise<AffinityApplication[]> {
    const rows = await this.prisma.postulacion.findMany({
      where: { id: applicationId, id_vacante: vacancyId, id_usuario: { not: null }, vacante: { empresa: {
        OR: [{ id_usuario: companyUserId }, { empresa_usuario_registros: { some: { id_usuario: companyUserId, estado: 'activo' } } }],
      } } }, select: selection,
    });
    return rows.flatMap((row) => toApplication(row) ?? []);
  }

  async claim(application: AffinityApplication, inputHash: string): Promise<string | null> {
    const claimId = randomUUID();
    const now = new Date();
    const until = new Date(now.getTime() + 30_000);
    const claimed = await this.prisma.postulacion.updateMany({
      where: {
        id: application.id, id_usuario: application.userId, id_vacante: application.vacancyId,
        AND: [
          { OR: [{ hash_entrada: null }, { hash_entrada: { not: inputHash } }, { estado_match: null }] },
          { OR: [{ reclamo_match_id: null }, { reclamo_match_hasta: { lte: now } }, { hash_en_calculo: { not: inputHash } }] },
        ],
      },
      data: { hash_en_calculo: inputHash, reclamo_match_id: claimId, reclamo_match_hasta: until },
    });
    return claimed.count === 1 ? claimId : null;
  }

  async releaseClaim(applicationId: string, claimId: string): Promise<void> {
    await this.prisma.postulacion.updateMany({
      where: { id: applicationId, reclamo_match_id: claimId },
      data: { hash_en_calculo: null, reclamo_match_id: null, reclamo_match_hasta: null },
    });
  }

  async persistIfCurrent(application: AffinityApplication, inputHash: string, result: JobPostingAffinityResult, claimId: string): Promise<boolean> {
    if (result.status === 'ready' && (!Number.isInteger(result.percentage) || result.percentage < 0 || result.percentage > 100 ||
      Number.isNaN(Date.parse(result.calculatedAt)))) {
      throw new Error('Resultado de afinidad fuera de contrato');
    }
    return this.prisma.$transaction(async (tx) => {
      // Profile writes lock the graduate row; vacancy edits use the same advisory key.
      const graduate = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM titulado WHERE id_usuario = ${application.userId}::uuid FOR UPDATE`;
      if (!graduate.length) {return false;}
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${application.vacancyId}))`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${application.id}))`;
      const current = await tx.postulacion.findFirst({
        where: { id: application.id, id_usuario: application.userId, id_vacante: application.vacancyId },
        select: { ...selection, reclamo_match_id: true },
      });
      if (!current) {return false;}
      if (current.reclamo_match_id !== claimId) {return false;}
      const [profile] = await this.data.readProfiles([application.userId], tx);
      const [vacancy] = await this.data.readRequirements([application.vacancyId], tx);
      if (!vacancy || jobPostingAffinityInputHash(profile ?? null, vacancy) !== inputHash) {return false;}
      if (current.hash_entrada === inputHash && current.estado_match) {
        await tx.postulacion.update({ where: { id: application.id }, data: {
          hash_en_calculo: null, reclamo_match_id: null, reclamo_match_hasta: null,
        } });
        return true;
      }
      await tx.postulacion.update({
        where: { id: application.id },
        data: {
          porcentaje_match: result.percentage,
          fecha_match: result.calculatedAt ? new Date(result.calculatedAt) : null,
          hash_entrada: inputHash,
          estado_match: result.status,
          hash_en_calculo: null,
          reclamo_match_id: null,
          reclamo_match_hasta: null,
        },
      });
      return true;
    });
  }

}
