import type { Prisma, PrismaClient } from '../../src/generated/prisma/client';
import { DEMO_GRADUATE_ID } from './demo-accounts';
import { AREA_IDS, DEMO_IDS } from './demo-ids';

export const mentores: Array<Prisma.MentorCreateManyInput & { id: string }> = [
  {
    id: DEMO_IDS.mentor,
    id_titulado: DEMO_GRADUATE_ID,
    descripcion: 'Mentor de demostración en desarrollo de software.',
    informacion_relevante: 'Orientación sobre primeros proyectos y búsqueda del primer empleo.',
    experiencia: 'Desarrollo de aplicaciones web con TypeScript y PostgreSQL.',
    esta_activo: true,
    anios_exp: 2,
    fecha_creacion: new Date(),
  },
];
export const especialidades: Array<Prisma.MentorAreaCreateManyInput & { id: string }> = [
  {
    id: '66100000-0000-4000-8000-000000000001',
    id_mentor: DEMO_IDS.mentor,
    id_area: AREA_IDS.technology,
  },
  {
    id: '66100000-0000-4000-8000-000000000002',
    id_mentor: DEMO_IDS.mentor,
    id_area: AREA_IDS.software,
  },
];
export const disponibilidades: Array<Prisma.DisponibilidadMentorCreateManyInput & { id: string }> =
  [
    {
      id: '66200000-0000-4000-8000-000000000001',
      id_mentor: DEMO_IDS.mentor,
      estado: 'DISPONIBLE',
      hora_inicio: new Date('1970-01-01T18:00:00Z'),
      hora_fin: new Date('1970-01-01T20:00:00Z'),
      fecha_creacion: new Date(),
      fecha_actualizacion: new Date(),
    },
  ];
export const espacios: Array<Prisma.EspacioDisponibleMentorCreateManyInput & { id: string }> = [
  {
    id: '66300000-0000-4000-8000-000000000001',
    id_mentor: DEMO_IDS.mentor,
    dia_semana: 2,
    horario_inicio: new Date('1970-01-01T18:00:00Z'),
    horario_fin: new Date('1970-01-01T20:00:00Z'),
    esta_activo: true,
    fecha_creacion: new Date(),
  },
];

export async function seedEpic6(prisma: PrismaClient): Promise<void> {
  if (mentores.length > 0) {
    await prisma.mentor.createMany({ data: mentores, skipDuplicates: true });
  }
  if (especialidades.length > 0) {
    await prisma.mentorArea.createMany({ data: especialidades, skipDuplicates: true });
  }
  await prisma.disponibilidadMentor.createMany({ data: disponibilidades, skipDuplicates: true });
  await prisma.espacioDisponibleMentor.createMany({ data: espacios, skipDuplicates: true });
}
