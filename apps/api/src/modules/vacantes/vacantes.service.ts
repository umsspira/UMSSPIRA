import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/infrastructure/database/prisma.service';

@Injectable()
export class VacantesService {
  constructor(private prisma: PrismaService) {}

  async obtenerMisVacantes(idUsuario: string) {
    const empresa = await this.prisma.empresa.findFirst({
      where: { id_usuario: idUsuario }
    });

    if (!empresa) {
      return [];
    }

    return this.prisma.vacante.findMany({
      where: { id_empresa: empresa.id },
      orderBy: { created_at: 'desc' }
    });
  }

  async cerrarVacante(idVacante: string) {
    return this.prisma.vacante.update({
      where: { id: idVacante },
      data: { estado: 'CERRADA' }
    });
  }
}