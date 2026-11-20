import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/infrastructure/database/prisma.service';
import { BusinessRuleError } from '../../shared/errors/business-rule-error';

// HU-04: códigos de etapa. El front traduce a etiquetas ("En revisión", etc.).
export const ETAPAS_POSTULACION = ['postulado', 'en_revision', 'preseleccionado', 'entrevista', 'descartado'] as const;
export type EtapaPostulacion = (typeof ETAPAS_POSTULACION)[number];

const ESTADOS_VACANTE_DISPONIBLE = ['PUBLICADO', 'PUBLICADA', 'ACTIVA', 'ACTIVO', 'ACTIVE', 'PUBLISHED'];

function vacanteDisponible(estado: string | null): boolean {
  return ESTADOS_VACANTE_DISPONIBLE.includes(estado?.trim().toUpperCase() ?? '');
}

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

  async estadoPostulacion(idVacante: string, idUsuario: string) {
    const titulado = await this.prisma.titulado.findFirst({
      where: { id_usuario: idUsuario },
      select: { id: true },
    });
    if (!titulado) {
      throw new ForbiddenException('Solo un titulado puede postularse');
    }

    const postulacion = await this.prisma.postulacion.findFirst({
      where: { id_usuario: idUsuario, id_vacante: idVacante },
      select: { id: true },
    });
    return { postulada: Boolean(postulacion) };
  }

  async postular(idVacante: string, idUsuario: string) {
    const titulado = await this.prisma.titulado.findFirst({
      where: { id_usuario: idUsuario },
      select: {
        id: true,
        formacion_academica_registros: { select: { id: true }, take: 1 },
        experiencia_laboral_registros: { select: { id: true }, take: 1 },
        certificacion_registros: { select: { id: true }, take: 1 },
        proyecto_registros: { select: { id: true }, take: 1 },
        perfil_area_registros: {
          where: { descripcion_profesional: { not: null } },
          select: { id: true, descripcion_profesional: true },
          take: 1,
        },
      },
    });
    if (!titulado) {
      throw new ForbiddenException('Solo un titulado puede postularse');
    }

    const previous = await this.prisma.postulacion.findFirst({
      where: { id_usuario: idUsuario, id_vacante: idVacante },
      select: { id: true },
    });
    if (previous) {
      return { postulada: true, yaExistia: true };
    }

    const perfilCompleto =
      titulado.formacion_academica_registros.length > 0 &&
      titulado.experiencia_laboral_registros.length > 0 &&
      titulado.certificacion_registros.length > 0 &&
      titulado.proyecto_registros.length > 0 &&
      Boolean(titulado.perfil_area_registros[0]?.descripcion_profesional?.trim());
    if (!perfilCompleto) {
      throw new BusinessRuleError(
        'conflict',
        'PROFILE_INCOMPLETE',
        'Completa tu perfil para postularte',
      );
    }

    const vacante = await this.prisma.vacante.findUnique({
      where: { id: idVacante },
      select: { id: true, estado: true, fecha_cierre: true },
    });
    const estado = String(vacante?.estado ?? '').trim().toUpperCase();
    const disponible = ['PUBLICADA', 'PUBLICADO', 'ACTIVA', 'ACTIVO'].includes(estado)
      && (!vacante?.fecha_cierre || vacante.fecha_cierre.getTime() > Date.now());
    if (!vacante || !disponible) {
      throw new BusinessRuleError(
        'conflict',
        'JOB_POSTING_UNAVAILABLE',
        'Esta vacante ya no está disponible',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Bloqueo por par Titulado/Vacante: dos solicitudes simultáneas solo pueden crear una fila.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${idUsuario}), hashtext(${idVacante}))`;
      const existing = await tx.postulacion.findFirst({
        where: { id_usuario: idUsuario, id_vacante: idVacante },
        select: { id: true },
      });
      if (existing) {
        return { postulada: true, yaExistia: true };
      }

      await tx.postulacion.create({
        data: {
          id_usuario: idUsuario,
          id_vacante: idVacante,
          estado: 'postulado',
          created_at: new Date(),
        },
      });
      return { postulada: true, yaExistia: false };
    });
  }

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

  async listarMisPostulaciones(idUsuario: string) {
    const filas = await this.prisma.postulacion.findMany({
      where: { id_usuario: idUsuario },
      orderBy: [{ created_at: { sort: 'desc', nulls: 'last' } }, { id: 'asc' }],
      select: {
        id: true,
        created_at: true,
        porcentaje_match: true,
        vacante: {
          select: {
            id: true,
            titulo: true,
            estado: true,
            empresa: { select: { razon_social: true } },
          },
        },
      },
    });

    return filas.map((fila) => {
      const porcentaje = fila.porcentaje_match === null ? null : Number(fila.porcentaje_match);
      return {
        id: fila.id,
        vacancyId: fila.vacante?.id ?? null,
        vacancyTitle: fila.vacante?.titulo ?? null,
        companyName: fila.vacante?.empresa?.razon_social ?? null,
        appliedAt: fila.created_at?.toISOString() ?? null,
        matchPercentage:
          porcentaje !== null && Number.isFinite(porcentaje) && porcentaje >= 0 && porcentaje <= 100
            ? porcentaje
            : null,
        isVacancyAvailable: vacanteDisponible(fila.vacante?.estado ?? null),
      };
    });
  }

  async obtenerOfertaParaTitulado(idVacante: string, idUsuario: string) {
    const vacante = await this.prisma.vacante.findFirst({
      where: {
        id: idVacante,
        OR: [
          { estado: { in: ESTADOS_VACANTE_DISPONIBLE } },
          { postulacion_registros: { some: { id_usuario: idUsuario } } },
        ],
      },
      select: {
        id: true,
        titulo: true,
        descripcion_tecnica: true,
        modalidad: true,
        nivel_experiencia: true,
        estado: true,
        created_at: true,
        empresa: { select: { razon_social: true } },
      },
    });

    if (!vacante) {
      throw new NotFoundException('Vacante no encontrada');
    }

    return {
      id: vacante.id,
      title: vacante.titulo,
      companyName: vacante.empresa?.razon_social ?? null,
      description: vacante.descripcion_tecnica,
      modality: vacante.modalidad,
      experienceLevel: vacante.nivel_experiencia,
      publishedAt: vacante.created_at?.toISOString() ?? null,
      isAvailable: vacanteDisponible(vacante.estado),
    };
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
  
  private async verificarVacanteDeMiEmpresa(idVacante: string, idUsuario: string): Promise<void> {
    const total = await this.prisma.vacante.count({
      where: {
        id: idVacante,
        empresa: {
          OR: [
            { id_usuario: idUsuario },
            { empresa_usuario_registros: { some: { id_usuario: idUsuario, estado: 'activo' } } },
          ],
        },
      },
    });
    if (!total) {
      throw new NotFoundException('Vacante no encontrada');
    }
  }

  // HU-01: forma que espera el front (applicants.ts → normalizeApplicant).
  private static readonly SELECT_POSTULANTE = {
    id: true,
    estado: true,
    porcentaje_match: true,
    created_at: true,
    usuario: {
      select: {
        nombre: true,
        correo: true,
        titulado: {
          select: {
            nombre: true,
            apellido: true,
            curriculum_vitae: { select: { id: true } },
          },
        },
      },
    },
  } as const;

  private static toPostulante(p: {
    id: string;
    estado: string | null;
    porcentaje_match: unknown;
    created_at: Date | null;
    usuario: {
      nombre: string | null;
      correo: string | null;
      titulado: { nombre: string | null; apellido: string | null; curriculum_vitae: { id: string } | null } | null;
    } | null;
  }) {
    const titulado = p.usuario?.titulado;
    const nombreCompleto = [titulado?.nombre, titulado?.apellido].filter(Boolean).join(' ');
    const match = p.porcentaje_match === null || p.porcentaje_match === undefined
      ? null
      : Number(p.porcentaje_match);
    return {
      id: p.id,
      name: nombreCompleto || p.usuario?.nombre || 'Sin nombre',
      email: p.usuario?.correo ?? '',
      location: null,
      experienceLevel: null,
      stage: p.estado ?? 'postulado',
      appliedAt: p.created_at ? p.created_at.toISOString() : null,
      hasCv: Boolean(titulado?.curriculum_vitae),
      cvUrl: null,
      // El porcentaje viene del motor (Épica 3/5); aquí NUNCA se calcula (CA-02, CA-10).
      matchPercentage: match !== null && Number.isFinite(match) ? match : null,
      skills: null,
    };
  }

  async listarPostulantes(idVacante: string, idUsuario: string) {
    await this.verificarVacanteDeMiEmpresa(idVacante, idUsuario);
    const filas = await this.prisma.postulacion.findMany({
      where: { id_vacante: idVacante },
      orderBy: [{ porcentaje_match: { sort: 'desc', nulls: 'last' } }, { created_at: 'asc' }],
      select: VacantesService.SELECT_POSTULANTE,
    });
    return filas.map((fila) => VacantesService.toPostulante(fila));
  }

  async obtenerPostulante(idVacante: string, idPostulacion: string, idUsuario: string) {
    await this.verificarVacanteDeMiEmpresa(idVacante, idUsuario);
    const fila = await this.prisma.postulacion.findFirst({
      where: { id: idPostulacion, id_vacante: idVacante },
      select: VacantesService.SELECT_POSTULANTE,
    });
    if (!fila) {
      throw new NotFoundException('Postulante no encontrado');
    }
    return VacantesService.toPostulante(fila);
  }
}
