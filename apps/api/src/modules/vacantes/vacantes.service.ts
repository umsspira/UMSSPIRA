import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../shared/infrastructure/database/prisma.service';
import { BusinessRuleError } from '../../shared/errors/business-rule-error';
import { isJobPostingAvailable } from '../job-postings/domain/policies/job-posting-availability.policy';
import {
  JOB_POSTING_STATUS,
  PUBLISHED_STATUS_VALUES,
  canTransitionJobPostingStatus,
  normalizeJobPostingStatus,
} from '../job-postings/domain/policies/job-posting-status.policy';
import { normalizeTechnicalRequirementName } from '../job-postings/domain/policies/normalize-technical-requirement-name';
import { CalculateJobPostingAffinity } from '../job-postings/application/use-cases/calculate-job-posting-affinity.use-case';
import {
  JOB_POSTING_AFFINITY_DATA,
  type JobPostingAffinityDataPort,
} from '../job-postings/application/ports/job-posting-affinity-data.port';


// HU-04: códigos de etapa. El front traduce a etiquetas ("En revisión", etc.).
export const ETAPAS_POSTULACION = ['postulado', 'en_revision', 'preseleccionado', 'entrevista', 'descartado'] as const;
export type EtapaPostulacion = (typeof ETAPAS_POSTULACION)[number];

// HU-14: el vocabulario y la regla de disponibilidad viven en job-postings/domain/policies.
// Una vacante "disponible" es PUBLICADA y sin fecha de cierre vencida (pausada/cerrada => no).
function vacanteDisponible(estado: string | null, fechaCierre: Date | null = null): boolean {
  return isJobPostingAvailable(estado, fechaCierre, new Date());
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
    if (!vacante || !vacanteDisponible(vacante.estado, vacante.fecha_cierre ?? null)) {
      throw new BusinessRuleError(
        'conflict',
        'JOB_POSTING_UNAVAILABLE',
        'Esta vacante ya no está disponible',
      );
    }

    // NLP y lecturas del perfil ocurren antes de abrir la transacción de postulación.
    const affinity = await this.calculateInitialAffinity(idVacante, idUsuario);

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
          porcentaje_match: affinity?.percentage ?? null,
          fecha_match: affinity?.calculatedAt ? new Date(affinity.calculatedAt) : null,
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
      const [calculation] = await this.calculateAffinity.execute({
        profile: profiles.find((profile) => profile.userId === idUsuario) ?? null,
        vacancies,
      });
      if (calculation?.result.status !== 'ready') {
        return null;
      }
      return {
        percentage: calculation.result.percentage,
        calculatedAt: calculation.result.calculatedAt,
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

    // HU-03: la tarjeta móvil muestra la cantidad de postulantes de cada vacante.
    const vacantes = await this.prisma.vacante.findMany({
      where: { id_empresa: empresa.id },
      orderBy: { created_at: 'desc' },
      include: { _count: { select: { postulacion_registros: true } } },
    });
    return vacantes.map(({ _count, ...vacante }) => ({
      ...vacante,
      total_postulantes: _count.postulacion_registros,
    }));
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
            fecha_cierre: true,
            empresa: { select: { razon_social: true } },
          },
        },
      },
    });

    return filas.map((fila) => {
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
        porcentajeValido ? porcentaje : null,
        matchCalculatedAt: porcentajeValido ? fila.fecha_match?.toISOString() ?? null : null,
        isVacancyAvailable: vacanteDisponible(fila.vacante?.estado ?? null),
      };
    });
  }

  async obtenerOfertaParaTitulado(idVacante: string, idUsuario: string) {
    const vacante = await this.prisma.vacante.findFirst({
      where: {
        id: idVacante,
        OR: [
          { estado: { in: [...PUBLISHED_STATUS_VALUES] } },
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
        fecha_cierre: true,
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
      isAvailable: vacanteDisponible(vacante.estado, vacante.fecha_cierre ?? null),
    };
  }

  // HU-14 · Ciclo de vida con permisos --------------------------------------------------

  /**
   * Devuelve la vacante SOLO si pertenece a una empresa del actor (dueño o usuario
   * activo invitado). Si no, 404: no se revela si la vacante existe en otra empresa.
   */
  private async obtenerVacanteDeMiEmpresa(idVacante: string, idUsuario: string) {
    const vacante = await this.prisma.vacante.findFirst({
      where: {
        id: idVacante,
        empresa: {
          OR: [
            { id_usuario: idUsuario },
            { empresa_usuario_registros: { some: { id_usuario: idUsuario, estado: 'activo' } } },
          ],
        },
      },
      select: { id: true, estado: true },
    });
    if (!vacante) {
      throw new NotFoundException('Vacante no encontrada');
    }
    return vacante;
  }

  /** Aplica una transición validada por la política única de estados. */
  private async cambiarEstado(idVacante: string, idUsuario: string, destino: string) {
    const objetivo = normalizeJobPostingStatus(destino);
    if (!objetivo) {
      throw new BadRequestException('Estado inválido');
    }

    const vacante = await this.obtenerVacanteDeMiEmpresa(idVacante, idUsuario);
    const actual = normalizeJobPostingStatus(vacante.estado);

    // Idempotente: repetir la misma acción (doble clic, reintento) no falla ni reescribe.
    if (actual === objetivo) {
      return { id: vacante.id, estado: objetivo };
    }
    if (!actual || !canTransitionJobPostingStatus(actual, objetivo)) {
      throw new BusinessRuleError(
        'conflict',
        'INVALID_JOB_POSTING_STATUS_TRANSITION',
        `No se puede pasar la vacante de ${actual ?? 'su estado actual'} a ${objetivo}`,
      );
    }

    return this.prisma.vacante.update({
      where: { id: vacante.id },
      data: { estado: objetivo, fecha_actualizacion: new Date() },
      select: { id: true, estado: true },
    });
  }

  async cerrarVacante(idVacante: string, idUsuario: string) {
    return this.cambiarEstado(idVacante, idUsuario, JOB_POSTING_STATUS.CLOSED);
  }

async actualizarVacante(idVacante: string, idUsuario: string, data: UpdateVacanteData) {
    // HU-13: el dueño y los miembros activos de la empresa pueden editar;
    // cualquier otro recibe 404 sin filtrar si la vacante existe.
    await this.verificarVacanteDeMiEmpresa(idVacante, idUsuario);

    // El cambio de estado (pausar / reanudar / cerrar) pasa por la política única.
    if (data.estado !== undefined) {
      await this.cambiarEstado(idVacante, idUsuario, data.estado);
    }
    const cambios: Record<string, string> = {};
  
    if (data.titulo !== undefined) {
      cambios['titulo'] = data.titulo;
    }

    if (data.modalidad !== undefined) {
      cambios['modalidad'] = data.modalidad;
    }

    if (data.nivel_experiencia !== undefined) {
      cambios['nivel_experiencia'] = data.nivel_experiencia;
    }

    if (data.descripcion_tecnica !== undefined) {
      cambios['descripcion_tecnica'] = data.descripcion_tecnica;
    }

    return this.prisma.$transaction(async (tx) => {
      // Bloqueo por vacante: dos envíos simultáneos se serializan.
      await tx.$queryRaw`
        SELECT pg_advisory_xact_lock(hashtext(${idVacante}))
      `;

      const actualizada = Object.keys(cambios).length
        ? await tx.vacante.update({
            where: { id: idVacante },
            data: {
              ...cambios,
              fecha_actualizacion: new Date(),
            },
          })
        : await tx.vacante.findUniqueOrThrow({
            where: { id: idVacante },
          });

      // Actualizar requisitos técnicos cuando fueron enviados.
      if (data.requisitosTecnicos !== undefined) {
        const owned = await tx.vacante.findFirst({
          where: {
            id: idVacante,
            empresa: {
              OR: [
                { id_usuario: idUsuario },
                {
                  empresa_usuario_registros: {
                    some: {
                      id_usuario: idUsuario,
                      estado: 'activo',
                    },
                  },
                },
              ],
            },
          },
          select: { id: true },
        });

        if (!owned) {
          throw new NotFoundException('Vacante no encontrada');
        }

        await tx.vacanteRequisitoTecnico.deleteMany({
          where: { id_vacante: idVacante },
        });

        if (data.requisitosTecnicos.length > 0) {
          await tx.vacanteRequisitoTecnico.createMany({
            data: data.requisitosTecnicos.map((nombre) => ({
              id_vacante: idVacante,
              nombre,
              nombre_normalizado: normalizeTechnicalRequirementName(nombre),
            })),
            skipDuplicates: true,
          });
        }
      }

      // TODO(HU-12): disparar aquí el recálculo de afinidad de las postulaciones
      // cuando exista el servicio de matching (HU-10/HU-12, epic7).

      return actualizada;
    });
  }


  async eliminarVacante(idVacante: string, idUsuario: string) {
    const vacante = await this.obtenerVacanteDeMiEmpresa(idVacante, idUsuario);

    const postulantes = await this.prisma.postulacion.count({ where: { id_vacante: vacante.id } });
    if (postulantes > 0) {
      throw new BusinessRuleError(
        'conflict',
        'JOB_POSTING_HAS_APPLICANTS',
        'La vacante tiene postulantes: ciérrala en lugar de eliminarla',
      );
    }

    return this.prisma.vacante.delete({ where: { id: vacante.id } });
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

  // HU-16: listado y detalle comparten la selección mínima de datos autorizados.
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
            // T16.2: la lista no lee los bytes; solo conserva CV con contenido.
            curriculum_vitae: {
              where: { contenido: { not: null } },
              select: { id: true },
            },
            experiencia_laboral_registros: {
              select: {
                cargo: true,
                empresa: true,
                fecha_inicio: true,
                fecha_fin: true,
              },
              orderBy: [{ fecha_inicio: 'desc' }, { id: 'asc' }],
            },
            formacion_academica_registros: {
              select: {
                titulo: true,
                institucion: true,
                anio_egreso: true,
                grado: true,
              },
              orderBy: [{ anio_egreso: 'desc' }, { id: 'asc' }],
            },
            certificacion_registros: {
              select: {
                nombre: true,
                entidad_emisora: true,
                grado: true,
                anio_emision: true,
              },
              orderBy: [{ anio_emision: { sort: 'desc', nulls: 'last' } }, { id: 'asc' }],
            },
          },
        },
      },
    },
  } satisfies Prisma.PostulacionSelect;

  private static toPostulante(p: {
    id: string;
    estado: string | null;
    porcentaje_match: unknown;
    fecha_match: Date | null;
    created_at: Date | null;
    usuario: {
      nombre: string | null;
      correo: string | null;
      titulado: {
        nombre: string | null;
        apellido: string | null;
        curriculum_vitae: { id: string } | null;
        experiencia_laboral_registros: {
          cargo: string;
          empresa: string;
          fecha_inicio: Date;
          fecha_fin: Date | null;
        }[];
        formacion_academica_registros: {
          titulo: string;
          institucion: string;
          anio_egreso: number;
          grado: string | null;
        }[];
        certificacion_registros: {
          nombre: string;
          entidad_emisora: string;
          grado: string;
          anio_emision: number | null;
        }[];
      } | null;
    } | null;
  }) {
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
      matchPercentage: matchValido ? match : null,
      matchCalculatedAt: matchValido ? p.fecha_match?.toISOString() ?? null : null,
      skills: null,
      workExperience: (titulado?.experiencia_laboral_registros ?? []).map((experiencia) => ({
        position: experiencia.cargo,
        company: experiencia.empresa,
        startDate: experiencia.fecha_inicio.toISOString().slice(0, 10),
        endDate: experiencia.fecha_fin?.toISOString().slice(0, 10) ?? null,
      })),
      education: (titulado?.formacion_academica_registros ?? []).map((formacion) => ({
        title: formacion.titulo,
        institution: formacion.institucion,
        graduationYear: formacion.anio_egreso,
        level: formacion.grado,
      })),
      certifications: (titulado?.certificacion_registros ?? []).map((certificacion) => ({
        name: certificacion.nombre,
        issuer: certificacion.entidad_emisora,
        level: certificacion.grado,
        year: certificacion.anio_emision,
      })),
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


  // T16.4 consume este archivo; la empresa se valida antes de leer el contenido binario.
  async descargarCvPostulante(idVacante: string, idPostulacion: string, idUsuario: string) {
    await this.verificarVacanteDeMiEmpresa(idVacante, idUsuario);
    const fila = await this.prisma.postulacion.findFirst({
      where: { id: idPostulacion, id_vacante: idVacante },
      select: {
        usuario: {
          select: {
            titulado: {
              select: {
                curriculum_vitae: {
                  select: { nombre: true, contenido: true, size_bytes: true },
                },
              },
            },
          },
        },
      },
    });
    const file = fila?.usuario?.titulado?.curriculum_vitae;
    if (!file?.contenido || !file.size_bytes) {
      throw new NotFoundException('El postulante aún no subió su CV');
    }
    return {
      name: file.nombre ?? 'cv.pdf',
      mime: 'application/pdf',
      bytes: file.contenido,
      size: file.size_bytes,
    };
  }
}

