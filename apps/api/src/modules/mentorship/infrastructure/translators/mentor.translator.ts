import type { Mentor as MentorRow, Titulado } from '../../../../generated/prisma/client';
import type { AvailabilityStatus, Mentor, MentorAvailability } from '../../domain/entities/mentor';

export const mentorInclude = {
  titulado: { select: { nombre: true, apellido: true, id_carrera: true } },
};

export function toMentor(
  row: MentorRow & { titulado: Pick<Titulado, 'nombre' | 'apellido' | 'id_carrera'> },
): Mentor {
  return {
    id: row.id,
    graduateId: row.id_titulado,
    graduateName: [row.titulado.nombre, row.titulado.apellido].filter(Boolean).join(' '),
    careerId: row.titulado.id_carrera,
    active: row.esta_activo === true,
    description: row.descripcion,
    experience: row.experiencia,
    relevantInformation: row.informacion_relevante,
    photoUrl: row.foto_perfil,
    experienceYears: row.anios_exp,
    createdAt: row.fecha_creacion,
    updatedAt: row.fecha_actualizacion,
  };
}

export function toAvailability(
  row: { estado: string | null; fecha_actualizacion: Date | null } | null | undefined,
): MentorAvailability {
  return {
    status: ['DISPONIBLE', 'EN_PAUSA', 'NO_DISPONIBLE'].includes(row?.estado ?? '')
      ? (row!.estado as AvailabilityStatus)
      : null,
    updatedAt: row?.fecha_actualizacion ?? null,
  };
}
