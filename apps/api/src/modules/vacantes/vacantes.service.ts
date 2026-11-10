import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../shared/infrastructure/database/prisma.service';
import type { CreateVacanteDto } from './dto/create-vacante.dto';

export interface UpdateVacanteData {
  titulo?: string;
  modalidad?: string;
  nivel_experiencia?: string;
  descripcion_tecnica?: string;
  descripcion?: string;
  ubicacion?: string;
  area?: string;
  condiciones?: string;
  estado?: string;
}

const VACANTE_INCLUDE = {
  empresa: true,
  vacante_requerimiento_laboral_registros: {
    include: { requerimiento_laboral: true },
  },
} satisfies Prisma.VacanteInclude;

type VacanteWithRelations = Prisma.VacanteGetPayload<{
  include: typeof VACANTE_INCLUDE;
}>;

const AVAILABLE_STATES = new Set([
  'publicada',
  'publicado',
  'publicada y vigente',
  'vigente',
  'abierta',
  'activo',
  'activa',
  'published',
  'open',
  'disponible',
]);

@Injectable()
export class VacantesService {
  constructor(private readonly prisma: PrismaService) {}

  async obtenerMisVacantes(idUsuario: string) {
    const empresa = await this.empresaDelUsuario(idUsuario);
    if (!empresa) {return [];}

    const vacancies = await this.prisma.vacante.findMany({
      where: { id_empresa: empresa.id },
      include: VACANTE_INCLUDE,
      orderBy: { created_at: 'desc' },
    });
    return vacancies.map((vacancy) => this.mapVacante(vacancy));
  }

  async obtenerVacantePorId(idVacante: string, idUsuario: string) {
    const empresa = await this.empresaDelUsuario(idUsuario);
    if (!empresa) {
      throw new NotFoundException('Empresa no encontrada.');
    }

    const vacancy = await this.prisma.vacante.findFirst({
      where: { id: idVacante, id_empresa: empresa.id },
      include: VACANTE_INCLUDE,
    });
    if (!vacancy) {
      throw new NotFoundException('Vacante no encontrada o sin permiso.');
    }
    return this.mapVacante(vacancy);
  }

  async crear(dto: CreateVacanteDto, idUsuario: string) {
    const empresa = await this.empresaDelUsuario(idUsuario);
    if (!empresa) {
      throw new NotFoundException(
        'La cuenta no tiene una empresa asociada para publicar vacantes.',
      );
    }
    if (dto.idEmpresa && dto.idEmpresa !== empresa.id) {
      throw new ForbiddenException(
        'La vacante debe pertenecer a la empresa asociada a tu cuenta.',
      );
    }

    const requisitos = this.normalizeRequirements(dto.requisitos);
    const idVacante = await this.prisma.$transaction(async (transaction) => {
      const vacancy = await transaction.vacante.create({
        data: {
          id_empresa: empresa.id,
          titulo: dto.titulo.trim(),
          modalidad: dto.modalidad.trim(),
          descripcion_tecnica: dto.descripcion.trim(),
          ubicacion: dto.ubicacion.trim(),
          area: dto.area.trim(),
          condiciones: dto.condiciones.trim(),
          estado: 'PUBLICADO',
          created_at: new Date(),
          fecha_publicacion: new Date(),
        },
      });

      for (const titulo of requisitos) {
        const requirement = await transaction.requerimientoLaboral.create({
          data: {
            id_empresa: empresa.id,
            titulo,
            estado: 'PUBLICADO',
          },
        });
        await transaction.vacanteRequerimientoLaboral.create({
          data: {
            id_vacante: vacancy.id,
            id_requerimiento_laboral: requirement.id,
          },
        });
      }

      return vacancy.id;
    });

    return this.obtenerPorId(idVacante);
  }

  async obtenerPorId(idVacante: string) {
    const vacancy = await this.prisma.vacante.findUnique({
      where: { id: idVacante },
      include: VACANTE_INCLUDE,
    });
    if (!vacancy) {
      throw new NotFoundException('La vacante no existe.');
    }
    return this.mapVacante(vacancy);
  }

  async listarPorEmpresa(idEmpresa: string) {
    const vacancies = await this.prisma.vacante.findMany({
      where: { id_empresa: idEmpresa },
      include: VACANTE_INCLUDE,
      orderBy: { created_at: 'desc' },
    });
    return vacancies.map((vacancy) => this.mapVacante(vacancy));
  }

  async agregarRequisitos(idVacante: string, requirements: string[]) {
    const vacancy = await this.prisma.vacante.findUnique({
      where: { id: idVacante },
      select: { id_empresa: true },
    });
    if (!vacancy) {
      throw new NotFoundException('La vacante indicada no existe.');
    }

    const requisitos = this.normalizeRequirements(requirements);
    await this.prisma.$transaction(async (transaction) => {
      const existing = await transaction.vacanteRequerimientoLaboral.findMany({
        where: { id_vacante: idVacante },
        include: { requerimiento_laboral: true },
      });
      const existingNames = new Set(
        existing.flatMap((item) =>
          item.requerimiento_laboral?.titulo
            ? [this.canonicalName(item.requerimiento_laboral.titulo)]
            : [],
        ),
      );

      for (const titulo of requisitos) {
        if (existingNames.has(this.canonicalName(titulo))) {
          throw new BadRequestException(
            `El requisito '${titulo}' ya está asociado a esta vacante.`,
          );
        }

        const requirement = await transaction.requerimientoLaboral.create({
          data: {
            id_empresa: vacancy.id_empresa,
            titulo,
            estado: 'PUBLICADO',
          },
        });
        await transaction.vacanteRequerimientoLaboral.create({
          data: {
            id_vacante: idVacante,
            id_requerimiento_laboral: requirement.id,
          },
        });
        existingNames.add(this.canonicalName(titulo));
      }
    });

    return this.obtenerPorId(idVacante);
  }

  async consultarDisponibilidad(buscar?: string) {
    const rows = await this.prisma.vacante.findMany({
      include: VACANTE_INCLUDE,
      orderBy: { created_at: 'desc' },
    });
    const term = buscar?.trim().toLocaleLowerCase();
    const vacancies = rows
      .filter((vacancy) => this.estaDisponible(vacancy))
      .filter((vacancy) => {
        if (!term) {return true;}
        const mapped = this.mapVacante(vacancy);
        return [
          mapped.titulo,
          mapped.empresa,
          mapped.descripcion,
          mapped.ubicacion,
          mapped.area,
        ].some(
          (value) =>
            typeof value === 'string' &&
            value.toLocaleLowerCase().includes(term),
        );
      })
      .map((vacancy) => this.mapVacante(vacancy));

    return { total: vacancies.length, vacantes: vacancies };
  }

  async cerrarVacante(idVacante: string, idUsuario: string) {
    await this.ensureOwnedVacancy(idVacante, idUsuario);
    return this.prisma.vacante.update({
      where: { id: idVacante },
      data: { estado: 'CERRADA', fecha_cierre: new Date() },
    });
  }

  async actualizarVacante(
    idVacante: string,
    idUsuario: string,
    data: UpdateVacanteData,
  ) {
    await this.ensureOwnedVacancy(idVacante, idUsuario);
    const description = data.descripcion_tecnica ?? data.descripcion;
    return this.prisma.vacante.update({
      where: { id: idVacante },
      data: {
        titulo: data.titulo?.trim(),
        modalidad: data.modalidad?.trim(),
        nivel_experiencia: data.nivel_experiencia?.trim(),
        descripcion_tecnica: description?.trim(),
        ubicacion: data.ubicacion?.trim(),
        area: data.area?.trim(),
        condiciones: data.condiciones?.trim(),
        estado: data.estado?.trim(),
      },
    });
  }

  async eliminarVacante(idVacante: string, idUsuario: string) {
    await this.ensureOwnedVacancy(idVacante, idUsuario);
    return this.prisma.vacante.delete({ where: { id: idVacante } });
  }

  private async empresaDelUsuario(idUsuario: string) {
    return this.prisma.empresa.findFirst({
      where: { id_usuario: idUsuario },
    });
  }

  private async ensureOwnedVacancy(idVacante: string, idUsuario: string) {
    const vacancy = await this.obtenerVacantePorId(idVacante, idUsuario);
    if (!vacancy) {
      throw new NotFoundException('Vacante no encontrada o sin permiso.');
    }
  }

  private mapVacante(vacancy: VacanteWithRelations) {
    return {
      ...vacancy,
      titulo: vacancy.titulo ?? '',
      modalidad: vacancy.modalidad ?? '',
      estado: vacancy.estado ?? '',
      idEmpresa: vacancy.id_empresa ?? '',
      empresa: vacancy.empresa?.razon_social ?? 'Empresa sin nombre registrado',
      fechaCreacion: vacancy.created_at?.toISOString() ?? null,
      descripcion: vacancy.descripcion_tecnica ?? '',
      ubicacion: vacancy.ubicacion ?? '',
      area: vacancy.area ?? '',
      condiciones: vacancy.condiciones ?? '',
      requisitos: vacancy.vacante_requerimiento_laboral_registros.flatMap(
        (relation) => {
          const requirement = relation.requerimiento_laboral;
          return requirement?.id && requirement.titulo
            ? [{ id: requirement.id, nombre: requirement.titulo }]
            : [];
        },
      ),
    };
  }

  private normalizeRequirements(requirements: string[]): string[] {
    if (!Array.isArray(requirements) || requirements.length === 0) {
      throw new BadRequestException(
        'Debe proporcionar al menos un requisito.',
      );
    }
    const normalized = requirements.map((requirement) => requirement.trim());
    if (normalized.some((requirement) => !requirement)) {
      throw new BadRequestException(
        'Los requisitos no pueden contener valores vacíos.',
      );
    }

    const canonicalNames = normalized.map((requirement) =>
      this.canonicalName(requirement),
    );
    if (new Set(canonicalNames).size !== normalized.length) {
      throw new BadRequestException('Los requisitos no pueden estar duplicados.');
    }
    return normalized;
  }

  private canonicalName(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .replace(/\s+/g, ' ')
      .toLocaleLowerCase();
  }

  private estaDisponible(vacancy: VacanteWithRelations): boolean {
    const estado = (vacancy.estado ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLocaleLowerCase();
    if (!AVAILABLE_STATES.has(estado)) {return false;}
    return !vacancy.fecha_cierre || vacancy.fecha_cierre >= new Date();
  }
}
