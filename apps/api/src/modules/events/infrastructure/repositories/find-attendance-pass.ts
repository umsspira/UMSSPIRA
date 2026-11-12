import type { Prisma } from '../../../../generated/prisma/client';
import { BusinessRuleError } from '../../../../shared/errors/business-rule-error';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { AccessError } from '../../../../shared/security/errors/access-error';
import { EventPassRules } from '../../domain/event-pass.rules';

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

  if (
    !EventPassRules.canGeneratePass(pass.inscripcion.estado ?? '', event.estado ?? '') ||
    !event.fecha_fin
  ) {
    throw new BusinessRuleError(
      'conflict',
      'ATTENDANCE_NOT_ALLOWED',
      'Se requiere una inscripción confirmada y un evento publicado con fecha de fin',
    );
  }
  const now = new Date();
  const effective = EventPassRules.resolveEffectiveStatus(
    pass.estado,
    pass.inscripcion.estado ?? '',
    event.estado ?? '',
    event.fecha_fin,
    now,
  );
  if (pass.estado !== 'VIGENTE' && pass.estado !== 'VENCIDO') {
    throw new BusinessRuleError('conflict', 'PASS_INACTIVE', 'El pase no está vigente');
  }
  if (effective.status === 'VENCIDO' || (pass.fecha_expiracion && pass.fecha_expiracion <= now)) {
    throw new BusinessRuleError('expired', 'PASS_EXPIRED', 'El pase ha vencido');
  }
  return { event, pass };
}
