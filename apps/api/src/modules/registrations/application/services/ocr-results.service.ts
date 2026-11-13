import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { BusinessRuleError } from '../../../../shared/errors/business-rule-error';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { OcrAnalysis, OcrReading, OcrResult } from '@umsspira/shared-types';
import { compareOcr } from '../../domain/policies/ocr-rules';
import { scopedApplication } from '../../infrastructure/repositories/prisma-applications.repository';
import { OcrService, type JobRow } from './ocr.service';

@Injectable()
export class OcrResultsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: OcrService,
  ) {}

  complete(actor: ActorContext, id: string, token: string, reading: OcrReading) {
    return this.queue.withLease(actor, id, token, async (tx, row) => {
      const result = compareOcr(row.declarado, reading);
      await tx.$executeRaw`INSERT INTO ocr_resultado(id_trabajo,resultado) VALUES (${id}::uuid,${JSON.stringify(result)}::jsonb)`;
      await tx.$executeRaw`UPDATE ocr_trabajo SET estado='COMPLETADO',finalizado_en=now(),reserva_hasta=NULL,reserva_token=NULL WHERE id=${id}::uuid`;
      return result;
    });
  }

  async analyses(actor: ActorContext, applicationId: string): Promise<OcrAnalysis[]> {
    const application = await this.prisma.solicitud.findFirst({
      where: scopedApplication(actor, applicationId),
    });
    if (!application) {
      throw new BusinessRuleError(
        'missing',
        'APPLICATION_NOT_FOUND',
        'La solicitud no existe o no está a tu cargo',
      );
    }
    const rows = await this.prisma.$queryRaw<(JobRow & { resultado: OcrResult | null })[]>`
      SELECT j.*,r.resultado FROM ocr_trabajo j LEFT JOIN ocr_resultado r ON r.id_trabajo=j.id
      WHERE j.id_solicitud=${applicationId}::uuid ORDER BY j.revision DESC`;
    return rows.map((row) => ({
      id: row.id,
      revision: row.revision,
      status: row.estado,
      current: row.revision === application.version_vigente,
      createdAt: row.creado_en.toISOString(),
      completedAt: row.finalizado_en?.toISOString() ?? null,
      error: row.error,
      result: row.resultado,
    }));
  }
}
