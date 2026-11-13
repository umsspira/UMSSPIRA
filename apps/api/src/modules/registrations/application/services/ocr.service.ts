import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { BusinessRuleError } from '../../../../shared/errors/business-rule-error';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { OcrAnalysis, OcrJob } from '@umsspira/shared-types';
import { scopedApplication } from '../../infrastructure/repositories/prisma-applications.repository';

export type JobRow = {
  id: string;
  id_solicitud: string;
  revision: number;
  id_documento: string;
  declarado: Record<string, unknown>;
  estado: OcrAnalysis['status'];
  reserva_token: string;
  reservado_por: string;
  reserva_hasta: Date;
  intentos: number;
  creado_en: Date;
  finalizado_en: Date | null;
  error: string | null;
};
const stale = () =>
  new BusinessRuleError(
    'conflict',
    'OCR_LEASE_EXPIRED',
    'La reserva o la versión ya no está vigente. Actualiza el expediente.',
  );

@Injectable()
export class OcrService {
  constructor(private readonly prisma: PrismaService) {}

  async claim(actor: ActorContext): Promise<OcrJob | null> {
    if (!actor.scopes.careerIds.length) {
      return null;
    }
    return this.prisma.$transaction(
      async (tx) => {
        // Lock both application and job: re-submission and claim share the same serialization point.
        const rows = await tx.$queryRaw<JobRow[]>(Prisma.sql`
        SELECT j.* FROM ocr_trabajo j JOIN solicitud s ON s.id=j.id_solicitud
        JOIN detalle_solicitud d ON d.id=s.id_detalle_solicitud
        WHERE d.id_carrera IN (${Prisma.join(actor.scopes.careerIds.map((id) => Prisma.sql`${id}::uuid`))})
          AND s.estado IN ('PENDIENTE','PENDING') AND s.version_vigente=j.revision
          AND s.id_documento_respaldo=j.id_documento
          AND (j.estado='PENDIENTE' OR (j.estado='EN_CURSO' AND j.reserva_hasta <= clock_timestamp()))
        ORDER BY j.creado_en FOR UPDATE OF s,j SKIP LOCKED LIMIT 1`);
        const row = rows[0];
        if (!row) {
          return null;
        }
        if (row.intentos >= 3) {
          await tx.$executeRaw`UPDATE ocr_trabajo SET estado='FALLIDO', finalizado_en=now(), reserva_token=NULL,
          reserva_hasta=NULL,error='Se agotaron los reintentos. Continúa con revisión manual.' WHERE id=${row.id}::uuid`;
          return null;
        }
        const token = randomUUID();
        const [reserved] = await tx.$queryRaw<JobRow[]>`UPDATE ocr_trabajo SET estado='EN_CURSO',
        intentos=intentos+1,reserva_token=${token}::uuid,reservado_por=${actor.id}::uuid,
        reserva_hasta=clock_timestamp()+interval '90 seconds',error=NULL WHERE id=${row.id}::uuid RETURNING *`;
        return {
          id: row.id,
          applicationId: row.id_solicitud,
          revision: row.revision,
          token,
          expiresAt: reserved.reserva_hasta.toISOString(),
        };
      },
      { maxWait: 2000, timeout: 10000 },
    );
  }

  async withLease<T>(
    actor: ActorContext,
    id: string,
    token: string,
    action: (tx: Prisma.TransactionClient, row: JobRow) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(
      async (tx) => {
        const [identity] = await tx.$queryRaw<
          { id_solicitud: string }[]
        >`SELECT id_solicitud FROM ocr_trabajo WHERE id=${id}::uuid`;
        if (!identity) {
          throw stale();
        }
        await tx.$queryRaw`SELECT id FROM solicitud WHERE id=${identity.id_solicitud}::uuid FOR UPDATE`;
        const application = await tx.solicitud.findFirst({
          where: scopedApplication(actor, identity.id_solicitud),
        });
        if (!application || !['PENDING', 'PENDIENTE'].includes(application.estado ?? '')) {
          throw stale();
        }
        const [row] = await tx.$queryRaw<JobRow[]>`SELECT * FROM ocr_trabajo WHERE id=${id}::uuid
        AND reserva_token=${token}::uuid AND reservado_por=${actor.id}::uuid
        AND estado='EN_CURSO' AND reserva_hasta > clock_timestamp() FOR UPDATE`;
        if (
          !row ||
          row.revision !== application.version_vigente ||
          row.id_documento !== application.id_documento_respaldo
        ) {
          throw stale();
        }
        return action(tx, row);
      },
      { timeout: 15000 },
    );
  }

  renew(actor: ActorContext, id: string, token: string) {
    return this.withLease(actor, id, token, async (tx, row) => {
      const [renewed] = await tx.$queryRaw<{ reserva_hasta: Date }[]>`UPDATE ocr_trabajo
        SET reserva_hasta=clock_timestamp()+interval '90 seconds' WHERE id=${row.id}::uuid RETURNING reserva_hasta`;
      return { expiresAt: renewed.reserva_hasta.toISOString() };
    });
  }

  document(actor: ActorContext, id: string, token: string) {
    return this.withLease(actor, id, token, async (tx, row) => {
      const document = await tx.documentoRespaldo.findUnique({ where: { id: row.id_documento } });
      const file = document?.ruta_storage
        ? await tx.archivoRegistro.findUnique({ where: { id: document.ruta_storage } })
        : null;
      if (!file) {
        throw new BusinessRuleError(
          'missing',
          'OCR_DOCUMENT_MISSING',
          'El respaldo no está disponible; requiere revisión manual.',
        );
      }
      return { bytes: file.contenido, mime: file.mime };
    });
  }

  fail(actor: ActorContext, id: string, token: string) {
    return this.withLease(actor, id, token, async (tx) => {
      await tx.$executeRaw`UPDATE ocr_trabajo SET estado=CASE WHEN intentos>=3 THEN 'FALLIDO' ELSE 'PENDIENTE' END,
        error='No se pudo leer el respaldo. Se permite continuar con revisión manual.',
        finalizado_en=CASE WHEN intentos>=3 THEN now() ELSE NULL END,reserva_token=NULL,reserva_hasta=NULL WHERE id=${id}::uuid`;
      return { saved: true };
    });
  }

  async statuses(actor: ActorContext, ids: string[]) {
    if (!ids.length || !actor.scopes.careerIds.length) {
      return [];
    }
    return this.prisma.$queryRaw<
      { applicationId: string; status: OcrAnalysis['status']; revision: number }[]
    >(Prisma.sql`
      SELECT s.id AS "applicationId",j.estado AS status,j.revision FROM solicitud s
      JOIN detalle_solicitud d ON d.id=s.id_detalle_solicitud
      JOIN ocr_trabajo j ON j.id_solicitud=s.id AND j.revision=s.version_vigente
      WHERE s.id IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`))})
      AND d.id_carrera IN (${Prisma.join(actor.scopes.careerIds.map((id) => Prisma.sql`${id}::uuid`))})`);
  }
}
