import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/infrastructure/database/prisma.service';

// HU-04: códigos de etapa. El front traduce a etiquetas ("En revisión", etc.).
export const ETAPAS_POSTULACION = ['postulado', 'en_revision', 'preseleccionado', 'entrevista', 'descartado'] as const;
export type EtapaPostulacion = (typeof ETAPAS_POSTULACION)[number];

export interface UpdateVacanteData {
  titulo?: string;
  modalidad?: string;
  nivel_experiencia?: string;
  descripcion_tecnica?: string;
  estado?: string; // <-- NUEVO: para poder pausar
}

@Injectable()
export class VacantesService {
  constructor(private prisma: PrismaService) {}

  async obtenerMisVacantes(idUsuario: string) {
    const empresa = await this.prisma.empresa.findFirst({
      where: { id_usuario: idUsuario }
    });

    if (!empresa) {return [];}

    return this.prisma.vacante.findMany({
      where: { id_empresa: empresa.id },
      orderBy: { created_at: 'desc' }
    });
  }

  async obtenerVacantePorId(idVacante: string, idUsuario: string) {
    const empresa = await this.prisma.empresa.findFirst({
      where: { id_usuario: idUsuario }
    });

    if (!empresa) {throw new Error('Empresa no encontrada');}

    return this.prisma.vacante.findFirst({
      where: { id: idVacante, id_empresa: empresa.id }
    });
  }

  async cerrarVacante(idVacante: string) {
    return this.prisma.vacante.update({
      where: { id: idVacante },
      data: { estado: 'CERRADA' }
    });
  }

  async actualizarVacante(idVacante: string, idUsuario: string, data: UpdateVacanteData) {
    const empresa = await this.prisma.empresa.findFirst({
      where: { id_usuario: idUsuario }
    });

    if (!empresa) {throw new Error('Empresa no encontrada');}

    const vacante = await this.prisma.vacante.findFirst({
      where: { id: idVacante, id_empresa: empresa.id }
    });

    if (!vacante) {throw new Error('Vacante no encontrada o sin permiso');}

    return this.prisma.vacante.update({
      where: { id: idVacante },
      data: {
        titulo: data.titulo,
        modalidad: data.modalidad,
        nivel_experiencia: data.nivel_experiencia,
        descripcion_tecnica: data.descripcion_tecnica,
        estado: data.estado, // <-- NUEVO
      }
    });
  }

  // NUEVO MÉTODO PARA ELIMINAR
  async eliminarVacante(idVacante: string, idUsuario: string) {
    const empresa = await this.prisma.empresa.findFirst({
      where: { id_usuario: idUsuario }
    });

    if (!empresa) {throw new Error('Empresa no encontrada');}

    const vacante = await this.prisma.vacante.findFirst({
      where: { id: idVacante, id_empresa: empresa.id }
    });

    if (!vacante) {throw new Error('Vacante no encontrada o sin permiso para eliminarla');}

    return this.prisma.vacante.delete({
      where: { id: idVacante }
    });
  }

  // HU-04: cambia la etapa de una postulación de una vacante de la empresa del actor.
  // Acepta al usuario dueño (empresa.id_usuario) y a los usuarios activos invitados (empresa_usuario, HU-02).
  async cambiarEtapaPostulante(idVacante: string, idPostulacion: string, idUsuario: string, etapa?: string) {
    if (!etapa || !(ETAPAS_POSTULACION as readonly string[]).includes(etapa)) {
      throw new BadRequestException('Etapa inválida');
    }

    const postulacion = await this.prisma.postulacion.findFirst({
      where: { id: idPostulacion, id_vacante: idVacante },
      select: { id: true, vacante: { select: { id_empresa: true } } },
    });
    if (!postulacion?.vacante?.id_empresa) {
      throw new NotFoundException('Postulación no encontrada');
    }

    const idEmpresa = postulacion.vacante.id_empresa;
    const tieneAcceso = await this.prisma.empresa.count({
      where: {
        id: idEmpresa,
        OR: [
          { id_usuario: idUsuario },
          { empresa_usuario_registros: { some: { id_usuario: idUsuario, estado: 'activo' } } },
        ],
      },
    });
    if (!tieneAcceso) {
      throw new ForbiddenException('No tienes permiso sobre esta vacante');
    }

    return this.prisma.postulacion.update({
      where: { id: idPostulacion },
      data: { estado: etapa },
      select: { id: true, estado: true },
    });
  }
}
