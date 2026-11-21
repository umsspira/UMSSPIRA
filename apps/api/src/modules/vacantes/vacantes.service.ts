import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/infrastructure/database/prisma.service';
import { BusinessRuleError } from '../../shared/errors/business-rule-error';
import { normalizeTechnicalRequirementName } from '../job-postings/domain/policies/normalize-technical-requirement-name';
import { CalculateJobPostingAffinity } from '../job-postings/application/use-cases/calculate-job-posting-affinity.use-case';
import { RefreshJobPostingAffinity } from '../job-postings/application/use-cases/refresh-job-posting-affinity.use-case';
import { jobPostingAffinityInputHash } from '../job-postings/domain/policies/job-posting-affinity-input-hash';
import { PrismaJobPostingAffinityDataAdapter } from '../job-postings/infrastructure/adapters/prisma-job-posting-affinity-data.adapter';
import {
  JOB_POSTING_AFFINITY_DATA,
  type JobPostingAffinityDataPort,
} from '../job-postings/application/ports/job-posting-affinity-data.port';

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
  requisitosTecnicos?: string[];
}

@Injectable()
export class VacantesService {
  private readonly logger = new Logger(VacantesService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(CalculateJobPostingAffinity)
    private readonly calculateAffinity: CalculateJobPostingAffinity,
    @Inject(JOB_POSTING_AFFINITY_DATA)
    private readonly affinityData: JobPostingAffinityDataPort,
    @Inject(RefreshJobPostingAffinity)
    private readonly refreshAffinity: RefreshJobPostingAffinity,
    private readonly transactionalAffinityData: PrismaJobPostingAffinityDataAdapter,
  ) {}

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

    // NLP y lecturas del perfil ocurren antes de abrir la transacción de postulación.
    const affinity = await this.calculateInitialAffinity(idVacante, idUsuario);

    return this.prisma.$transaction(async (tx) => {
      // Serializa la comprobación final con escrituras del perfil y de requisitos.
      await tx.$queryRaw`SELECT id FROM titulado WHERE id_usuario = ${idUsuario}::uuid FOR UPDATE`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${idVacante}))`;
      const currentVacancy = await tx.vacante.findUnique({
        where: { id: idVacante }, select: { estado: true, fecha_cierre: true },
      });
      if (!currentVacancy || !vacanteDisponible(currentVacancy.estado) ||
        (currentVacancy.fecha_cierre && currentVacancy.fecha_cierre.getTime() <= Date.now())) {
        throw new BusinessRuleError('conflict', 'JOB_POSTING_UNAVAILABLE', 'Esta vacante ya no está disponible');
      }
      const [currentProfiles, currentRequirements] = await Promise.all([
        this.transactionalAffinityData.readProfiles([idUsuario], tx),
        this.transactionalAffinityData.readRequirements([idVacante], tx),
      ]);
      const currentHash = currentRequirements[0]
        ? jobPostingAffinityInputHash(currentProfiles[0] ?? null, currentRequirements[0]) : null;
      const initial = affinity && currentHash === affinity.hash ? affinity : null;
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
          porcentaje_match: initial?.percentage ?? null,
          fecha_match: initial?.calculatedAt ? new Date(initial.calculatedAt) : null,
          hash_entrada: initial?.hash ?? null,
          estado_match: initial?.status ?? null,
        },
      });
      return { postulada: true, yaExistia: false };
    });
  }

  private async calculateInitialAffinity(idVacante: string, idUsuario: string) {
    try {
      const [profiles, vacancies] = await Promise.all([
        this.affinityData.readProfiles([idUsuario]),
        this.affinityData.readRequirements([idVacante]),
      ]);
      const profile = profiles.find((item) => item.userId === idUsuario) ?? null;
      const vacancy = vacancies.find((item) => item.vacancyId === idVacante);
      if (!vacancy) {return null;}
      const [calculation] = await this.calculateAffinity.execute({
        profile,
        vacancies,
      });
      if (!calculation) {return null;}
      if (calculation.result.status === 'ready' &&
        (!Number.isInteger(calculation.result.percentage) || calculation.result.percentage < 0 ||
        calculation.result.percentage > 100 || Number.isNaN(Date.parse(calculation.result.calculatedAt)))) {
        throw new Error('Resultado de afinidad fuera de contrato');
      }
      return {
        percentage: calculation.result.percentage,
        calculatedAt: calculation.result.calculatedAt,
        status: calculation.result.status,
        hash: jobPostingAffinityInputHash(profile, vacancy),
      };
    } catch {
      this.logger.warn('No se pudo calcular la afinidad al postular; se guardará sin resultado.');
      return null;
    }
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
      where: { id: idVacante, id_empresa: empresa.id },
      include: { requisito_tecnico_registros: { select: { nombre: true }, orderBy: { nombre: 'asc' } } },
    });
  }

  async listarMisPostulaciones(idUsuario: string) {
    const refreshed = await this.refreshAffinity.forUser(idUsuario);
    const filas = await this.prisma.postulacion.findMany({
      where: { id_usuario: idUsuario },
      orderBy: [{ created_at: { sort: 'desc', nulls: 'last' } }, { id: 'asc' }],
      select: {
        id: true,
        created_at: true,
        porcentaje_match: true,
        fecha_match: true,
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
      const matchStatus = refreshed.get(fila.id) ?? 'pending';
      const porcentaje = fila.porcentaje_match === null ? null : Number(fila.porcentaje_match);
      const porcentajeValido =
        porcentaje !== null && Number.isInteger(porcentaje) && porcentaje >= 0 && porcentaje <= 100;
      return {
        id: fila.id,
        vacancyId: fila.vacante?.id ?? null,
        vacancyTitle: fila.vacante?.titulo ?? null,
        companyName: fila.vacante?.empresa?.razon_social ?? null,
        appliedAt: fila.created_at?.toISOString() ?? null,
        matchPercentage:
          matchStatus === 'ready' && porcentajeValido ? porcentaje : null,
        matchCalculatedAt: matchStatus === 'ready' && porcentajeValido ? fila.fecha_match?.toISOString() ?? null : null,
        matchStatus,
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
    // HU-13: el dueño y los miembros activos de la empresa pueden editar;
    // cualquier otro recibe 404 sin filtrar si la vacante existe.
    await this.verificarVacanteDeMiEmpresa(idVacante, idUsuario);

    // Solo se escriben los campos enviados; el resto queda intacto.
    const cambios: Record<string, string> = {};
    if (data.titulo !== undefined) {cambios['titulo'] = data.titulo;}
    if (data.modalidad !== undefined) {cambios['modalidad'] = data.modalidad;}
    if (data.nivel_experiencia !== undefined) {cambios['nivel_experiencia'] = data.nivel_experiencia;}
    if (data.descripcion_tecnica !== undefined) {cambios['descripcion_tecnica'] = data.descripcion_tecnica;}
    if (data.estado !== undefined) {cambios['estado'] = data.estado;}

    return this.prisma.$transaction(async (tx) => {
      // Bloqueo por vacante: dos envíos simultáneos (doble clic o reenvío)
      // se serializan y el resultado es el mismo que con un solo envío.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${idVacante}))`;
      const actualizada = Object.keys(cambios).length
        ? await tx.vacante.update({ where: { id: idVacante }, data: cambios })
        : await tx.vacante.findUniqueOrThrow({ where: { id: idVacante } });
      if (data.requisitosTecnicos !== undefined) {
        const owned = await tx.vacante.findFirst({
          where: { id: idVacante, empresa: { OR: [
            { id_usuario: idUsuario },
            { empresa_usuario_registros: { some: { id_usuario: idUsuario, estado: 'activo' } } },
          ] } },
          select: { id: true },
        });
        if (!owned) {throw new NotFoundException('Vacante no encontrada');}
        await tx.vacanteRequisitoTecnico.deleteMany({ where: { id_vacante: idVacante } });
        if (data.requisitosTecnicos.length) {await tx.vacanteRequisitoTecnico.createMany({
          data: data.requisitosTecnicos.map((nombre) => ({ id_vacante: idVacante, nombre, nombre_normalizado: normalizeTechnicalRequirementName(nombre) })),
          skipDuplicates: true,
        });}
      }
      // HU-12: el cambio de requisitos se confirma en esta transacción. La siguiente
      // consulta autorizada compara el hash persistido y recalcula solo las postulaciones
      // de esta vacante. Pausar/cerrar no modifica el porcentaje histórico.
      return actualizada;
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
    fecha_match: true,
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
    fecha_match: Date | null;
    created_at: Date | null;
    usuario: {
      nombre: string | null;
      correo: string | null;
      titulado: { nombre: string | null; apellido: string | null; curriculum_vitae: { id: string } | null } | null;
    } | null;
  }, matchStatus: string = 'pending') {
    const titulado = p.usuario?.titulado;
    const nombreCompleto = [titulado?.nombre, titulado?.apellido].filter(Boolean).join(' ');
    const match = p.porcentaje_match === null || p.porcentaje_match === undefined
      ? null
      : Number(p.porcentaje_match);
    const matchValido = match !== null && Number.isInteger(match) && match >= 0 && match <= 100;
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
      matchPercentage: matchStatus === 'ready' && matchValido ? match : null,
      matchCalculatedAt: matchStatus === 'ready' && matchValido ? p.fecha_match?.toISOString() ?? null : null,
      matchStatus,
      skills: null,
    };
  }

  async listarPostulantes(idVacante: string, idUsuario: string) {
    await this.verificarVacanteDeMiEmpresa(idVacante, idUsuario);
    const refreshed = await this.refreshAffinity.forVacancy(idVacante, idUsuario);
    const filas = await this.prisma.postulacion.findMany({
      where: { id_vacante: idVacante },
      orderBy: [{ porcentaje_match: { sort: 'desc', nulls: 'last' } }, { created_at: 'asc' }],
      select: VacantesService.SELECT_POSTULANTE,
    });
    return filas.map((fila) => VacantesService.toPostulante(fila, refreshed.get(fila.id)));
  }

  async obtenerPostulante(idVacante: string, idPostulacion: string, idUsuario: string) {
    await this.verificarVacanteDeMiEmpresa(idVacante, idUsuario);
    const refreshed = await this.refreshAffinity.forApplication(idVacante, idUsuario, idPostulacion);
    const fila = await this.prisma.postulacion.findFirst({
      where: { id: idPostulacion, id_vacante: idVacante },
      select: VacantesService.SELECT_POSTULANTE,
    });
    if (!fila) {
      throw new NotFoundException('Postulante no encontrado');
    }
    return VacantesService.toPostulante(fila, refreshed.get(fila.id));
  }
}
