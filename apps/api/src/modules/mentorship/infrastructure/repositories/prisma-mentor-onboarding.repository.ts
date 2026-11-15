import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { BusinessRuleError } from '../../../../shared/errors/business-rule-error';
import { UnprocessableEntityError } from '../../../../shared/errors/unprocessable-entity-error';
import type { MentorOnboardingRepository } from '../../application/ports/mentor-onboarding-repository.port';
import type {
  OnboardingAreasInput,
  OnboardingAvailabilityInput,
  OnboardingInterestsInput,
} from '../../application/contracts/mentor-onboarding';
import type {
  MentorOnboardingSnapshot,
  MentorOnboardingState,
} from '../../domain/entities/mentor-onboarding';
import type {
  AreaReference,
  InterestCatalogGroup,
  MentorInterest,
  MentorSchedule,
} from '../../domain/entities/mentor';
import {
  assertPreviousOnboardingStepCompleted,
  assertValidOnboardingAreas,
  assertValidOnboardingAvailability,
  assertValidOnboardingInterests,
  onboardingStatus,
} from '../../domain/policies/mentor-onboarding.policy';
import { describeArea } from '../../domain/policies/area-description.policy';
import { availabilityOrder } from './mentor-transaction';
import { linkedAreaInclude } from './mentor-catalog-reader';
import { toAvailability, toSchedule } from '../translators/mentor.translator';

const timeOfDay = (value: string) => new Date(`1970-01-01T${value}:00.000Z`);

function forbiddenMentor(): never {
  throw new BusinessRuleError(
    'forbidden',
    'MENTOR_NO_HABILITADO',
    'Activa tu participación como mentor para configurar tu perfil',
  );
}

/** La identidad siempre proviene del token; el body no puede escoger otro mentor. */
async function lockActiveMentor(tx: Prisma.TransactionClient, userId: string) {
  await tx.$queryRaw`SELECT id FROM titulado WHERE id_usuario = ${userId}::uuid FOR UPDATE`;
  const mentor = await tx.mentor.findFirst({
    where: { titulado: { id_usuario: userId } },
    select: { id: true, esta_activo: true },
  });
  if (!mentor || mentor.esta_activo !== true) {
    forbiddenMentor();
  }
  return mentor;
}

function sortAreas(areas: AreaReference[]) {
  return [...areas].sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

async function readState(
  db: Prisma.TransactionClient,
  mentorId: string,
): Promise<MentorOnboardingState> {
  const [catalogRows, links, availabilityRow, scheduleRows] = await Promise.all([
    db.area.findMany({
      where: { padre_id: null, esta_activo: true },
      orderBy: [{ nombre: 'asc' }, { id: 'asc' }],
      select: { id: true, nombre: true },
    }),
    db.mentorArea.findMany({ where: { id_mentor: mentorId }, include: linkedAreaInclude }),
    db.disponibilidadMentor.findFirst({
      where: { id_mentor: mentorId },
      orderBy: availabilityOrder,
    }),
    db.espacioDisponibleMentor.findMany({
      where: { id_mentor: mentorId, esta_activo: true },
      orderBy: [{ dia_semana: 'asc' }, { horario_inicio: 'asc' }, { id: 'asc' }],
    }),
  ]);

  const selectedRoots = new Map<string, AreaReference>();
  const interests: MentorInterest[] = [];
  for (const link of links) {
    const area = link.area;
    if (!area) {
      continue;
    }
    if (area.padre_id === null) {
      selectedRoots.set(area.id, { id: area.id, name: area.nombre ?? '' });
    } else if (area.padre) {
      interests.push({
        id: area.id,
        name: area.nombre ?? '',
        area: { id: area.padre.id, name: area.padre.nombre ?? '' },
      });
    }
  }

  const selectedIds = [...selectedRoots.keys()];
  const children = selectedIds.length
    ? await db.area.findMany({
        where: { padre_id: { in: selectedIds }, esta_activo: true },
        orderBy: [{ nombre: 'asc' }, { id: 'asc' }],
        select: { id: true, nombre: true, padre_id: true },
      })
    : [];
  const selectedInterestIds = interests.map((interest) => interest.id);
  const selectedInterestSet = new Set(selectedInterestIds);
  const interestCatalog: InterestCatalogGroup[] = sortAreas([...selectedRoots.values()]).map(
    (area) => ({
      area: {
        ...area,
        description: describeArea(area.name),
        selected: true,
        locked: false,
      },
      interests: children
        .filter((child) => child.padre_id === area.id)
        .map((child) => ({
          id: child.id,
          name: child.nombre ?? '',
          area,
          selected: selectedInterestSet.has(child.id),
        })),
    }),
  );

  const availability = toAvailability(availabilityRow);
  const schedules = scheduleRows.flatMap(toSchedule);
  const snapshot: MentorOnboardingSnapshot = {
    hasAreas: selectedIds.length > 0,
    hasInterests: interests.length > 0,
    hasAvailability: availability.status !== null && schedules.length > 0,
  };
  const status = onboardingStatus(snapshot);

  return {
    ...snapshot,
    ...status,
    totalSteps: 3,
    areas: {
      catalog: catalogRows.map((area) => ({ id: area.id, name: area.nombre ?? '' })),
      selectedIds,
      interests: interests.sort(
        (a, b) =>
          a.area.name.localeCompare(b.area.name, 'es') || a.name.localeCompare(b.name, 'es'),
      ),
    },
    interests: interestCatalog,
    selectedInterestIds,
    availability: { status: availability.status, schedules },
  };
}

async function persistProgress(
  tx: Prisma.TransactionClient,
  mentorId: string,
  state: MentorOnboardingState,
): Promise<void> {
  const status = onboardingStatus(state);
  const now = new Date();
  const existing = await tx.mentorOnboarding.findUnique({
    where: { id_mentor: mentorId },
    select: { finalizado_en: true },
  });
  const finalizedAt = status.isComplete ? (existing?.finalizado_en ?? now) : null;
  await tx.mentorOnboarding.upsert({
    where: { id_mentor: mentorId },
    create: {
      id_mentor: mentorId,
      paso_actual: status.currentStep,
      pasos_completados: status.completedSteps,
      finalizado_en: finalizedAt,
      fecha_creacion: now,
      fecha_actualizacion: now,
    },
    update: {
      paso_actual: status.currentStep,
      pasos_completados: status.completedSteps,
      finalizado_en: finalizedAt,
      fecha_actualizacion: now,
    },
  });
}

@Injectable()
export class PrismaMentorOnboardingRepository implements MentorOnboardingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async read(userId: string): Promise<MentorOnboardingState> {
    const mentor = await this.prisma.mentor.findFirst({
      where: { titulado: { id_usuario: userId } },
      select: { id: true, esta_activo: true },
    });
    if (!mentor || mentor.esta_activo !== true) {
      forbiddenMentor();
    }
    return readState(this.prisma, mentor.id);
  }

  async saveAreas(userId: string, input: OnboardingAreasInput) {
    return this.prisma.$transaction(
      async (tx) => {
        const mentor = await lockActiveMentor(tx, userId);
        assertValidOnboardingAreas(input.areaIds);

        const roots = await tx.area.findMany({
          where: { id: { in: input.areaIds }, padre_id: null, esta_activo: true },
          select: { id: true },
        });
        if (roots.length !== input.areaIds.length) {
          throw new UnprocessableEntityError(
            'DATOS_PASO_INVALIDOS',
            'Selecciona únicamente áreas raíz activas del catálogo',
            { areaIds: ['Una o más áreas no existen o están inactivas'] },
          );
        }

        const links = await tx.mentorArea.findMany({
          where: { id_mentor: mentor.id },
          include: linkedAreaInclude,
        });
        const selected = new Set(input.areaIds);
        const retained = new Set<string>();
        const removed: string[] = [];
        for (const link of links) {
          const area = link.area;
          if (
            !area ||
            (area.padre_id === null ? !selected.has(area.id) : !selected.has(area.padre_id)) ||
            retained.has(area.id)
          ) {
            removed.push(link.id);
          } else {
            retained.add(area.id);
          }
        }
        if (removed.length) {
          await tx.mentorArea.deleteMany({
            where: { id: { in: removed }, id_mentor: mentor.id },
          });
        }
        const added = input.areaIds.filter((id) => !retained.has(id));
        if (added.length) {
          await tx.mentorArea.createMany({
            data: added.map((id) => ({
              id_mentor: mentor.id,
              id_area: id,
              fecha_creacion: new Date(),
            })),
            skipDuplicates: true,
          });
        }

        const state = await readState(tx, mentor.id);
        await persistProgress(tx, mentor.id, state);
        return state;
      },
      { timeout: 15000 },
    );
  }

  async saveInterests(userId: string, input: OnboardingInterestsInput) {
    return this.prisma.$transaction(
      async (tx) => {
        const mentor = await lockActiveMentor(tx, userId);
        const before = await readState(tx, mentor.id);
        assertPreviousOnboardingStepCompleted(2, before);
        assertValidOnboardingInterests(input.interestIds);

        const interests = await tx.area.findMany({
          where: { id: { in: input.interestIds } },
          include: { padre: { select: { id: true, padre_id: true, esta_activo: true } } },
        });
        if (
          interests.length !== input.interestIds.length ||
          interests.some(
            (interest) =>
              !interest.esta_activo ||
              !interest.padre ||
              !interest.padre.esta_activo ||
              interest.padre.padre_id !== null,
          )
        ) {
          throw new UnprocessableEntityError(
            'DATOS_PASO_INVALIDOS',
            'Selecciona intereses activos de áreas raíz activas',
            { interestIds: ['Uno o más intereses no existen o están inactivos'] },
          );
        }
        const selectedAreas = new Set(before.areas.selectedIds);
        if (interests.some((interest) => !selectedAreas.has(interest.padre_id!))) {
          throw new UnprocessableEntityError(
            'DATOS_PASO_INVALIDOS',
            'Los intereses deben pertenecer a las áreas técnicas seleccionadas',
            { interestIds: ['Hay intereses de un área que no seleccionaste'] },
          );
        }

        const links = await tx.mentorArea.findMany({
          where: { id_mentor: mentor.id },
          include: { area: { select: { padre_id: true } } },
        });
        const desired = new Set(input.interestIds);
        const removedInterests = links
          .filter((link) => link.area?.padre_id !== null && !desired.has(link.id_area!))
          .map((link) => link.id);
        if (removedInterests.length) {
          await tx.mentorArea.deleteMany({
            where: { id: { in: removedInterests }, id_mentor: mentor.id },
          });
        }
        await tx.mentorArea.createMany({
          data: input.interestIds.map((id) => ({
            id_mentor: mentor.id,
            id_area: id,
            fecha_creacion: new Date(),
          })),
          skipDuplicates: true,
        });

        const state = await readState(tx, mentor.id);
        await persistProgress(tx, mentor.id, state);
        return state;
      },
      { timeout: 15000 },
    );
  }

  async saveAvailability(userId: string, input: OnboardingAvailabilityInput) {
    return this.prisma.$transaction(
      async (tx) => {
        const mentor = await lockActiveMentor(tx, userId);
        const before = await readState(tx, mentor.id);
        assertPreviousOnboardingStepCompleted(3, before);
        const schedules: MentorSchedule[] = input.schedules.map((schedule) => ({
          weekday: schedule.weekday,
          start: schedule.start,
          end: schedule.end,
        }));
        assertValidOnboardingAvailability(input.availabilityStatus, schedules);

        const now = new Date();
        const current = await tx.disponibilidadMentor.findFirst({
          where: { id_mentor: mentor.id },
          orderBy: availabilityOrder,
        });
        if (current) {
          await tx.disponibilidadMentor.update({
            where: { id: current.id },
            data: { estado: input.availabilityStatus, fecha_actualizacion: now },
          });
        } else {
          await tx.disponibilidadMentor.create({
            data: {
              id_mentor: mentor.id,
              estado: input.availabilityStatus,
              fecha_creacion: now,
              fecha_actualizacion: now,
            },
          });
        }

        // El conjunto de horarios se reemplaza completo dentro de la misma transacción:
        // repetir el paso no acumula filas duplicadas y dos pestañas dejan el último valor válido.
        await tx.espacioDisponibleMentor.deleteMany({ where: { id_mentor: mentor.id } });
        await tx.espacioDisponibleMentor.createMany({
          data: schedules.map((schedule) => ({
            id_mentor: mentor.id,
            dia_semana: schedule.weekday,
            horario_inicio: timeOfDay(schedule.start),
            horario_fin: timeOfDay(schedule.end),
            esta_activo: true,
            fecha_creacion: now,
            fecha_actualizacion: now,
          })),
        });

        const state = await readState(tx, mentor.id);
        await persistProgress(tx, mentor.id, state);
        return state;
      },
      { timeout: 15000 },
    );
  }
}
