
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';

@Injectable()
export class DownloadMyCertificateService {
  constructor(private readonly prisma: PrismaService) {}

  async execute(certificateId: string, userId: string): Promise<Buffer> {
    const certificate = await this.prisma.certificado.findFirst({
      where: {
        id: certificateId,
        id_usuario: userId,
      },
      select: {
        contenido: true,
      },
    });

    if (!certificate) {
      throw new NotFoundException('Certificado no encontrado');
    }

    return Buffer.from(certificate.contenido);
  }
}

