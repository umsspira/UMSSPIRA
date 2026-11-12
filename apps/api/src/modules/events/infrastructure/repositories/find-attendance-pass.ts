import type { Prisma } from '../../../../generated/prisma/client';
import { BusinessRuleError } from '../../../../shared/errors/business-rule-error';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { AccessError } from '../../../../shared/security/errors/access-error';

export async function findAttendancePass(
  tx: Prisma.TransactionClient,
  actor: Pick<ActorContext, 'id' | 'permissions'>,
  eventId: string,
  qrToken: string,
) {
  if (!actor.permissions.includes('eventos:manage')) {
    throw new AccessError('FORBIDDEN');
  }

  const event = await tx.evento.findFirst({
    where: { id: eventId, id_usuario: actor.id, archivado: false },
    select: { id: true, estado: true, fecha_fin: true },
  });
  if (!event) {
    throw new BusinessRuleError(
      'missing',
      'EVENT_NOT_FOUND',
      'No se encontró el evento solicitado',
    );
  }

  const pass = await tx.paseQr.findUnique({
    where: { token_hash: qrToken },
    select: {
      estado: true,
      fecha_expiracion: true,
      inscripcion: { select: { id: true, id_evento: true, id_usuario: true, estado: true } },
    },
  });
  if (!pass || !pass.inscripcion.id_evento || !pass.inscripcion.id_usuario) {
    throw new BusinessRuleError('missing', 'PASS_NOT_FOUND', 'No se encontró un pase reconocido');
  }
  if (pass.inscripcion.id_evento !== event.id) {
    throw new BusinessRuleError(
      'conflict',
      'PASS_EVENT_MISMATCH',
      'El pase corresponde a otro evento',
    );
  }

  return { event, pass };
}
