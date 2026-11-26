
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { EventPassRules } from '../domain/event-pass.rules';
import type { EventPassDto } from '@umsspira/shared-types';

@Injectable()
export class ListUserPassesService {
  constructor(private readonly prisma: PrismaService) {}

  async execute(usuarioTitularId: string): Promise<EventPassDto[]> {
    const pases = await this.prisma.paseQr.findMany({
      where: {
        inscripcion: {
          id_usuario: usuarioTitularId,
        },
      },
      select: {
        id: true,
        id_inscripcion: true,
        token_hash: true,
        estado: true,
        fecha_generacion: true,
        fecha_expiracion: true,
        inscripcion: {
          select: {
            id_evento: true,
            estado: true,
            evento: {
              select: {
                titulo: true,
                estado: true,
                fecha_inicio: true,
                fecha_fin: true,
                ubicacion: true,
              },
            },
            usuario: {
              select: {
                nombre: true,
                titulado: {
                  select: {
                    nombre: true,
                    apellido: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { fecha_generacion: 'desc' },
    });

    return pases.map((pase) => {
      const effectiveStatus = EventPassRules.resolveEffectiveStatus(
        pase.estado,
        pase.inscripcion?.estado ?? '',
        pase.inscripcion?.evento?.estado ?? '',
        pase.inscripcion?.evento?.fecha_fin ?? new Date(0),
      );

      return {
        id: pase.id,
        registrationId: pase.id_inscripcion,
        eventId: pase.inscripcion?.id_evento ?? '',
        userId: usuarioTitularId,
        qrToken: pase.token_hash,
        status: effectiveStatus.status,
        isValidForAccess: effectiveStatus.isValid,
        issuedAt: pase.fecha_generacion.toISOString(),
        expiresAt: pase.fecha_expiracion
          ? pase.fecha_expiracion.toISOString()
          : null,
        eventDetails: {
          name: pase.inscripcion?.evento?.titulo ?? 'Evento UMSSPIRA',
          userName:
            [
              pase.inscripcion?.usuario?.titulado?.nombre,
              pase.inscripcion?.usuario?.titulado?.apellido,
            ]
              .filter((part): part is string => Boolean(part?.trim()))
              .map((part) => part.trim())
              .join(' ') ||
            pase.inscripcion?.usuario?.nombre?.trim() ||
            'Titulado',
          dateTime:
            pase.inscripcion?.evento?.fecha_inicio?.toISOString() ?? '',
          location:
            pase.inscripcion?.evento?.ubicacion ?? 'Ubicación por definir',
        },
      };
    });
  }
}