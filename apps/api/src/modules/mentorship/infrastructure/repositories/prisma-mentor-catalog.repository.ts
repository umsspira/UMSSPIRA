import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { BusinessRuleError } from '../../../../shared/errors/business-rule-error';
import { HttpError } from '../../../../shared/http/errors/http-error';
import type {
  CreateCustomInterestResult,
  MentorCatalogRepository,
} from '../../application/ports/mentor-catalog-repository.port';
import type { MentorInterest } from '../../domain/entities/mentor';
import { assertDistinctInterests } from '../../domain/policies/mentor.policy';
import { describeArea } from '../../domain/policies/area-description.policy';
import {
  MAX_CUSTOM_INTERESTS_PER_AREA,
  normalizeInterestText,
  validateCustomInterestText,
} from '../../domain/policies/custom-interest.policy';
import { lockOwnMentor } from './mentor-transaction';
import { linkedAreaInclude, readMentorAreas, requireOwnMentor } from './mentor-catalog-reader';
import { customInterestsTableAvailable, readOptionalCustomInterests } from './optional-custom-interests';

@Injectable()
export class PrismaMentorCatalogRepository implements MentorCatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async areas(userId: string) {
    const mentor = await requireOwnMentor(this.prisma, userId, true);
    return readMentorAreas(this.prisma, mentor.id, { allowMissingCustomInterests: true });
  }

  async setAreas(userId: string, ids: string[]) {
    return this.prisma.$transaction(
      async (tx) => {
        const mentor = await lockOwnMentor(tx, userId, true);
        const customAvailable = await customInterestsTableAvailable(tx);
        const roots = await tx.area.findMany({
          where: { id: { in: ids }, padre_id: null, esta_activo: true },
          select: { id: true },
        });
        if (roots.length !== ids.length) {
          throw new BusinessRuleError(
            'invalid',
            'AREA_INVALID',
            'Selecciona únicamente áreas raíz activas del catálogo',
          );
        }
        const links = await tx.mentorArea.findMany({
          where: { id_mentor: mentor.id },
          include: linkedAreaInclude,
        });
        const selected = new Set(ids);
        const retained = new Set<string>();
        const removed: string[] = [];
        const removedRootAreaIds: string[] = [];

        for (const link of links) {
          const area = link.area;
          if (
            !area ||
            (area.padre_id === null ? !selected.has(area.id) : !selected.has(area.padre_id)) ||
            retained.has(area.id)
          ) {
            removed.push(link.id);
            if (area?.padre_id === null && !selected.has(area.id)) {
              removedRootAreaIds.push(area.id);
            }
          } else {
            retained.add(area.id);
          }
        }
        if (removed.length) {
          await tx.mentorArea.deleteMany({ where: { id: { in: removed }, id_mentor: mentor.id } });
        }
        // CAF-14: Al quitar un área raíz, se eliminan también sus intereses personalizados asociados
        if (customAvailable && removedRootAreaIds.length) {
          await tx.mentorInteresPersonalizado.deleteMany({
            where: { id_mentor: mentor.id, id_area: { in: removedRootAreaIds } },
          });
        }
        const added = ids.filter((id) => !retained.has(id));
        if (added.length) {
          await tx.mentorArea.createMany({
            data: added.map((id) => ({
              id_mentor: mentor.id,
              id_area: id,
              fecha_creacion: new Date(),
            })),
          });
        }
        return readMentorAreas(tx, mentor.id, { customInterestsAvailable: customAvailable });
      },
      { timeout: 15000 },
    );
  }

  async interestCatalog(userId: string) {
    const mentor = await requireOwnMentor(this.prisma, userId);
    const [roots, links, customResult] = await Promise.all([
      this.prisma.area.findMany({
        where: { padre_id: null, esta_activo: true },
        orderBy: [{ nombre: 'asc' }, { id: 'asc' }],
        select: { id: true, nombre: true },
      }),
      this.prisma.mentorArea.findMany({
        where: { id_mentor: mentor.id },
        select: { id_area: true },
      }),
      readOptionalCustomInterests(() => this.prisma.mentorInteresPersonalizado.findMany({
        where: { id_mentor: mentor.id },
        orderBy: [{ fecha_creacion: 'asc' }, { id: 'asc' }],
      })),
    ]);
    const children = roots.length
      ? await this.prisma.area.findMany({
          where: { padre_id: { in: roots.map((root) => root.id) }, esta_activo: true },
          orderBy: [{ nombre: 'asc' }, { id: 'asc' }],
        })
      : [];
    const selected = new Set(links.map((link) => link.id_area));
    return roots
      .sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es'))
      .map((root) => {
        const areaSelected = selected.has(root.id);
        const areaSuggested = children
          .filter((child) => child.padre_id === root.id)
          .map((child) => ({
            id: child.id,
            name: child.nombre ?? '',
            area: { id: root.id, name: root.nombre ?? '' },
            selected: selected.has(child.id),
            esPersonalizado: false,
          }));
        const areaCustom = customResult.rows
          .filter((custom) => custom.id_area === root.id)
          .map((custom) => ({
            id: custom.id,
            name: custom.nombre,
            area: { id: root.id, name: root.nombre ?? '' },
            selected: true,
            esPersonalizado: true,
          }));
        return {
          area: {
            id: root.id,
            name: root.nombre ?? '',
            description: describeArea(root.nombre),
            selected: areaSelected,
            locked: !areaSelected,
          },
          interests: [...areaSuggested, ...areaCustom],
          customInterestsAvailable: customResult.available,
        };
      });
  }

  async interests(userId: string) {
    const mentor = await requireOwnMentor(this.prisma, userId);
    const state = await readMentorAreas(this.prisma, mentor.id, {
      activeRootsOnly: true,
      allowMissingCustomInterests: true,
    });
    return state.interests;
  }

  async saveInterests(userId: string, areaIds: string[], topicIds: string[]) {
    return this.prisma.$transaction(
      async (tx) => {
        const mentor = await lockOwnMentor(tx, userId, true);
        const customAvailable = await customInterestsTableAvailable(tx);
        const roots = await tx.area.findMany({
          where: { id: { in: areaIds }, padre_id: null, esta_activo: true },
          select: { id: true },
        });
        if (roots.length !== areaIds.length) {
          throw new BusinessRuleError(
            'invalid',
            'AREA_INVALID',
            'Selecciona únicamente áreas raíz activas del catálogo',
          );
        }

        // Los ids recibidos pueden ser tópicos sugeridos (tabla area) o
        // intereses personalizados (tabla mentor_interes_personalizado).
        // Los personalizados no viven en mentor_area: solo se validan.
        const [topics, customInterests] = await Promise.all([
          topicIds.length
            ? tx.area.findMany({
                where: { id: { in: topicIds }, padre_id: { not: null } },
                include: { padre: true },
              })
            : Promise.resolve([]),
          customAvailable && topicIds.length
            ? tx.mentorInteresPersonalizado.findMany({
                where: { id: { in: topicIds }, id_mentor: mentor.id },
                select: { id: true, id_area: true },
              })
            : Promise.resolve([]),
        ]);
        const suggestedIds = new Set(topics.map((topic) => topic.id));
        const customIds = new Set(customInterests.map((custom) => custom.id));
        if (suggestedIds.size + customIds.size !== topicIds.length) {
          throw new BusinessRuleError(
            'invalid',
            'INTEREST_INVALID',
            'El tópico ya no está disponible en el catálogo',
          );
        }

        const areaSet = new Set(areaIds);
        for (const topic of topics) {
          if (
            !topic.esta_activo ||
            !topic.padre ||
            !topic.padre.esta_activo ||
            topic.padre.padre_id !== null
          ) {
            throw new BusinessRuleError(
              'invalid',
              'INTEREST_INVALID',
              'Selecciona intereses activos de áreas raíz activas',
            );
          }
        }
        if (topics.some((topic) => !areaSet.has(topic.padre_id!))) {
          throw new BusinessRuleError(
            'forbidden',
            'INTEREST_AREA_NOT_SELECTED',
            'El área del interés no está asignada a tu perfil',
          );
        }
        if (customInterests.some((custom) => !areaSet.has(custom.id_area))) {
          throw new BusinessRuleError(
            'forbidden',
            'INTEREST_AREA_NOT_SELECTED',
            'El área del interés no está asignada a tu perfil',
          );
        }

        const desired = new Set<string>([...areaIds, ...suggestedIds]);
        const links = await tx.mentorArea.findMany({
          where: { id_mentor: mentor.id },
          include: linkedAreaInclude,
        });
        const retained = new Set<string>();
        const removedLinkIds: string[] = [];
        const removedRootIds: string[] = [];
        for (const link of links) {
          const area = link.area;
          if (!area || !desired.has(area.id) || retained.has(area.id)) {
            removedLinkIds.push(link.id);
            if (area?.padre_id === null && !desired.has(area.id)) {
              removedRootIds.push(area.id);
            }
          } else {
            retained.add(area.id);
          }
        }
        if (removedLinkIds.length) {
          await tx.mentorArea.deleteMany({
            where: { id: { in: removedLinkIds }, id_mentor: mentor.id },
          });
        }
        // CAF-14: al quitar un área raíz se eliminan sus intereses personalizados.
        if (customAvailable && removedRootIds.length) {
          await tx.mentorInteresPersonalizado.deleteMany({
            where: { id_mentor: mentor.id, id_area: { in: removedRootIds } },
          });
        }
        const added = [...desired].filter((id) => !retained.has(id));
        if (added.length) {
          await tx.mentorArea.createMany({
            data: added.map((id) => ({
              id_mentor: mentor.id,
              id_area: id,
              fecha_creacion: new Date(),
            })),
          });
        }
        return readMentorAreas(tx, mentor.id, { customInterestsAvailable: customAvailable });
      },
      { timeout: 15000 },
    );
  }

  async addInterests(userId: string, ids: string[]) {
    assertDistinctInterests(ids);
    return this.prisma.$transaction(
      async (tx) => {
        const mentor = await lockOwnMentor(tx, userId);
        const [interests, links] = await Promise.all([
          tx.area.findMany({ where: { id: { in: ids } }, include: { padre: true } }),
          tx.mentorArea.findMany({ where: { id_mentor: mentor.id }, select: { id_area: true } }),
        ]);
        if (
          interests.length !== ids.length ||
          interests.some(
            (interest) =>
              !interest.esta_activo ||
              !interest.padre ||
              !interest.padre.esta_activo ||
              interest.padre.padre_id !== null,
          )
        ) {
          throw new BusinessRuleError(
            'invalid',
            'INTEREST_INVALID',
            'Selecciona intereses activos de áreas raíz activas',
          );
        }
        const selected = new Set(links.map((link) => link.id_area));
        if (interests.some((interest) => !selected.has(interest.padre_id!))) {
          throw new BusinessRuleError(
            'forbidden',
            'INTEREST_AREA_NOT_SELECTED',
            'El área del interés no está asignada a tu perfil',
          );
        }
        if (ids.some((id) => selected.has(id))) {
          throw new BusinessRuleError(
            'conflict',
            'INTEREST_ALREADY_SELECTED',
            'El perfil ya tiene seleccionado ese interés',
          );
        }
        await tx.mentorArea.createMany({
          data: ids.map((id) => ({
            id_mentor: mentor.id,
            id_area: id,
            fecha_creacion: new Date(),
          })),
        });
        return interests.map((interest) => ({
          id: interest.id,
          name: interest.nombre ?? '',
          area: { id: interest.padre!.id, name: interest.padre!.nombre ?? '' },
          esPersonalizado: false,
        }));
      },
      { timeout: 15000 },
    );
  }

  async removeInterest(userId: string, id: string): Promise<void> {
    await this.prisma.$transaction(
      async (tx) => {
        const mentor = await lockOwnMentor(tx, userId);
        // Verificar si es un interés sugerido o personalizado
        const custom = await tx.mentorInteresPersonalizado.findUnique({ where: { id } });
        if (custom) {
          if (custom.id_mentor !== mentor.id) {
            throw new HttpError(
              403,
              'MENTOR_NO_HABILITADO',
              'No tienes permiso sobre este recurso',
            );
          }
          await tx.mentorInteresPersonalizado.delete({ where: { id } });
          return;
        }

        const interest = await tx.area.findUnique({ where: { id }, select: { padre_id: true } });
        if (!interest) {
          throw new BusinessRuleError('missing', 'INTEREST_NOT_FOUND', 'El interés no existe');
        }
        if (!interest.padre_id) {
          throw new BusinessRuleError(
            'invalid',
            'INTEREST_INVALID',
            'Un área raíz no se elimina como interés',
          );
        }
        const removed = await tx.mentorArea.deleteMany({
          where: { id_mentor: mentor.id, id_area: id },
        });
        if (!removed.count) {
          throw new BusinessRuleError(
            'missing',
            'INTEREST_NOT_SELECTED',
            'El perfil no tiene seleccionado ese interés',
          );
        }
      },
      { timeout: 15000 },
    );
  }

  async createCustomInterest(
    userId: string,
    areaId: string,
    text: string,
  ): Promise<CreateCustomInterestResult> {
    const cleaned = validateCustomInterestText(text);
    const normalized = normalizeInterestText(cleaned);

    return this.prisma.$transaction(
      async (tx) => {
        const mentor = await lockOwnMentor(tx, userId, true);

        // CANF-04: Verificar que el área raíz esté asignada al perfil del mentor
        const areaLink = await tx.mentorArea.findFirst({
          where: {
            id_mentor: mentor.id,
            id_area: areaId,
            area: { padre_id: null, esta_activo: true },
          },
          include: { area: true },
        });
        if (!areaLink || !areaLink.area) {
          throw new HttpError(
            422,
            'AREA_NO_CONFIGURADA',
            'El área técnica no está asignada a tu perfil',
          );
        }

        // CAF-07: Coincidencia con un sugerido del área
        const suggestedList = await tx.area.findMany({
          where: { padre_id: areaId, esta_activo: true },
        });
        const matched = suggestedList.find(
          (item) => normalizeInterestText(item.nombre ?? '') === normalized,
        );

        if (matched) {
          const alreadySelected = await tx.mentorArea.findFirst({
            where: { id_mentor: mentor.id, id_area: matched.id },
          });
          if (!alreadySelected) {
            await tx.mentorArea.create({
              data: {
                id_mentor: mentor.id,
                id_area: matched.id,
                fecha_creacion: new Date(),
              },
            });
          }
          return {
            interest: {
              id: matched.id,
              name: matched.nombre ?? '',
              area: { id: areaLink.area.id, name: areaLink.area.nombre ?? '' },
              esPersonalizado: false,
            },
            coincidenciaSugerido: true,
            mensaje: 'Se seleccionó el interés sugerido existente',
          };
        }

        // CANF-10 / CAF-08: Límite de intereses personalizados por área
        const count = await tx.mentorInteresPersonalizado.count({
          where: { id_mentor: mentor.id, id_area: areaId },
        });
        if (count >= MAX_CUSTOM_INTERESTS_PER_AREA) {
          throw new HttpError(
            422,
            'LIMITE_INTERESES_ALCANZADO',
            `Alcanzaste el límite de ${MAX_CUSTOM_INTERESTS_PER_AREA} temas personalizados permitidos en esta área`,
          );
        }

        // CANF-08 / CAF-06: Duplicados en el área
        const existing = await tx.mentorInteresPersonalizado.findFirst({
          where: { id_mentor: mentor.id, id_area: areaId, nombre_normalizado: normalized },
        });
        if (existing) {
          throw new HttpError(
            409,
            'INTERES_DUPLICADO',
            'Ya tienes este interés en el área',
          );
        }

        // CANF-11 & CANF-09: Persistencia y atomicidad
        try {
          const created = await tx.mentorInteresPersonalizado.create({
            data: {
              id_mentor: mentor.id,
              id_area: areaId,
              nombre: cleaned,
              nombre_normalizado: normalized,
              es_personalizado: true,
              fecha_creacion: new Date(),
            },
          });
          return {
            interest: {
              id: created.id,
              name: created.nombre,
              area: { id: areaLink.area.id, name: areaLink.area.nombre ?? '' },
              esPersonalizado: true,
            },
            coincidenciaSugerido: false,
            mensaje: 'Interés agregado',
          };
        } catch (err: unknown) {
          if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'P2002') {
            throw new HttpError(
              409,
              'INTERES_DUPLICADO',
              'Ya tienes este interés en el área',
            );
          }
          throw err;
        }
      },
      { timeout: 15000 },
    );
  }

  async updateCustomInterest(
    userId: string,
    id: string,
    text: string,
  ): Promise<MentorInterest> {
    const cleaned = validateCustomInterestText(text);
    const normalized = normalizeInterestText(cleaned);

    return this.prisma.$transaction(
      async (tx) => {
        const mentor = await lockOwnMentor(tx, userId, true);

        const current = await tx.mentorInteresPersonalizado.findUnique({
          where: { id },
          include: { area: true },
        });
        if (!current) {
          throw new HttpError(404, 'INTEREST_NOT_FOUND', 'El interés personalizado no existe');
        }
        if (current.id_mentor !== mentor.id) {
          throw new HttpError(
            403,
            'MENTOR_NO_HABILITADO',
            'No tienes permiso para modificar este interés',
          );
        }

        const duplicate = await tx.mentorInteresPersonalizado.findFirst({
          where: {
            id_mentor: mentor.id,
            id_area: current.id_area,
            nombre_normalizado: normalized,
            id: { not: id },
          },
        });
        if (duplicate) {
          throw new HttpError(
            409,
            'INTERES_DUPLICADO',
            'Ya tienes este interés en el área',
          );
        }

        try {
          const updated = await tx.mentorInteresPersonalizado.update({
            where: { id },
            data: {
              nombre: cleaned,
              nombre_normalizado: normalized,
              fecha_actualizacion: new Date(),
            },
          });
          return {
            id: updated.id,
            name: updated.nombre,
            area: { id: current.area.id, name: current.area.nombre ?? '' },
            esPersonalizado: true,
          };
        } catch (err: unknown) {
          if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'P2002') {
            throw new HttpError(
              409,
              'INTERES_DUPLICADO',
              'Ya tienes este interés en el área',
            );
          }
          throw err;
        }
      },
      { timeout: 15000 },
    );
  }

  async removeCustomInterest(userId: string, id: string): Promise<void> {
    await this.prisma.$transaction(
      async (tx) => {
        const mentor = await lockOwnMentor(tx, userId, true);

        const current = await tx.mentorInteresPersonalizado.findUnique({ where: { id } });
        if (!current) {
          throw new HttpError(404, 'INTEREST_NOT_FOUND', 'El interés personalizado no existe');
        }
        if (current.id_mentor !== mentor.id) {
          throw new HttpError(
            403,
            'MENTOR_NO_HABILITADO',
            'No tienes permiso para eliminar este interés',
          );
        }

        await tx.mentorInteresPersonalizado.delete({ where: { id } });
      },
      { timeout: 15000 },
    );
  }
}
