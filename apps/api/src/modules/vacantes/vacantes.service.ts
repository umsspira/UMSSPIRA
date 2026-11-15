import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/infrastructure/database/prisma.service';
import { VacancySearchIndexerService } from './vacancy-search-indexer.service';

export interface UpdateVacanteData {
  titulo?: string;
  modalidad?: string;
  nivel_experiencia?: string;
  descripcion_tecnica?: string;
  estado?: string;
}

@Injectable()
export class VacantesService {
  private readonly logger = new Logger(VacantesService.name);

  constructor(
    private prisma: PrismaService,
    private readonly searchIndexer: VacancySearchIndexerService,
  ) {}

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

    if (!empresa) {throw new NotFoundException('Empresa no encontrada');}

    const vacante = await this.prisma.vacante.findFirst({
      where: { id: idVacante, id_empresa: empresa.id }
    });
    if (!vacante) {throw new NotFoundException('Vacante no encontrada');}
    return vacante;
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

    if (!empresa) {throw new NotFoundException('Empresa no encontrada');}

    const vacante = await this.prisma.vacante.findFirst({
      where: { id: idVacante, id_empresa: empresa.id }
    });

    if (!vacante) {throw new NotFoundException('Vacante no encontrada o sin permiso');}

    const actualizada = await this.prisma.vacante.update({
      where: { id: idVacante },
      data: {
        titulo: data.titulo,
        modalidad: data.modalidad,
        nivel_experiencia: data.nivel_experiencia,
        descripcion_tecnica: data.descripcion_tecnica,
        estado: data.estado,
        fecha_actualizacion: new Date(),
      },
      include: {
        vacante_requerimiento_laboral_registros: {
          select: {
            requerimiento_laboral: {
              select: {
                descripcion: true,
                ubicacion: true,
                requerimiento_habilidad_registros: {
                  select: {
                    nivel_requerimiento: true,
                    area: { select: { nombre: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    const requirements = actualizada.vacante_requerimiento_laboral_registros
      .map(({ requerimiento_laboral }) => requerimiento_laboral)
      .filter((requirement) => requirement !== null);
    const technicalRequirements = requirements.flatMap((requirement) => [
      ...(requirement.descripcion ? [{ nombre: requirement.descripcion, nivel: null }] : []),
      ...requirement.requerimiento_habilidad_registros.flatMap((skill) =>
        skill.area?.nombre
          ? [{ nombre: skill.area.nombre, nivel: skill.nivel_requerimiento }]
          : [],
      ),
    ]);

    try {
      await this.searchIndexer.upsert({
        id: actualizada.id,
        titulo: actualizada.titulo,
        modalidad: actualizada.modalidad,
        nivel_experiencia: actualizada.nivel_experiencia,
        descripcion_tecnica: actualizada.descripcion_tecnica,
        estado: actualizada.estado,
        fecha_actualizacion: actualizada.fecha_actualizacion,
        requisitos_tecnicos: technicalRequirements,
        ubicaciones: requirements.flatMap((requirement) =>
          requirement.ubicacion ? [requirement.ubicacion] : [],
        ),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.warn(
        `La vacante ${actualizada.id} se guardó, pero no pudo sincronizarse con Elasticsearch: ${reason}`,
      );
    }

    return {
      id: actualizada.id,
      id_empresa: actualizada.id_empresa,
      titulo: actualizada.titulo,
      salario: actualizada.salario,
      modalidad: actualizada.modalidad,
      estado: actualizada.estado,
      created_at: actualizada.created_at,
      nivel_experiencia: actualizada.nivel_experiencia,
      descripcion_tecnica: actualizada.descripcion_tecnica,
      fecha_publicacion: actualizada.fecha_publicacion,
      fecha_cierre: actualizada.fecha_cierre,
      fecha_actualizacion: actualizada.fecha_actualizacion,
    };
  }

  // NUEVO MÉTODO PARA ELIMINAR
  async eliminarVacante(idVacante: string, idUsuario: string) {
    const empresa = await this.prisma.empresa.findFirst({
      where: { id_usuario: idUsuario }
    });

    if (!empresa) {throw new NotFoundException('Empresa no encontrada');}

    const vacante = await this.prisma.vacante.findFirst({
      where: { id: idVacante, id_empresa: empresa.id }
    });

    if (!vacante) {throw new NotFoundException('Vacante no encontrada o sin permiso para eliminarla');}

    return this.prisma.vacante.delete({
      where: { id: idVacante }
    });
  }
}