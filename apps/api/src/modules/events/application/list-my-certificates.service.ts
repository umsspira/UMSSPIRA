import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';

@Injectable()
export class ListMyCertificatesService {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string) {
    const certificates = await this.prisma.certificado.findMany({
      where: {
        id_usuario: userId,
      },
      select: {
        id: true,
        fecha_emision: true,
        evento: {
          select: {
            titulo: true,
            fecha_inicio: true,
            fecha_fin: true,
          },
        },
      },
      orderBy: {
        fecha_emision: 'desc',
      },
    });

    return certificates.map((certificate) => ({
      id: certificate.id,
      eventName: certificate.evento.titulo ?? 'Evento sin título',
      participationDate: (
        certificate.evento.fecha_fin ??
        certificate.evento.fecha_inicio ??
        certificate.fecha_emision
      ).toISOString(),
    }));
  }
}
