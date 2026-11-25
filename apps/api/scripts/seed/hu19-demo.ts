import type { Prisma, PrismaClient } from '../../src/generated/prisma/client';
import { DEMO_CAREER_ID, DEMO_COMPANY_ID } from './demo-accounts';
import { AREA_IDS, DEMO_IDS } from './demo-ids';
import { E4_VACANCY_EMPTY, E4_VACANCY_WITH_APPLICANTS } from './epic-4';

/**
 * Épica 5 · HU-19: datos de prueba para la demo.
 * - Vacantes con requisitos técnicos (VacanteRequisitoTecnico).
 * - Titulados con perfiles y habilidades variadas.
 * - Postulaciones con y sin afinidad calculada (porcentaje_match null).
 * Todos los UUID son fijos y se insertan con skipDuplicates: se puede repetir sin duplicar.
 */
const id = (prefix: string, n: number) => `${prefix}-0000-4000-8000-${n.toString().padStart(12, '0')}`;

export const HU19_VACANCY_IDS = {
  backend: id('55100000', 1),
  frontend: id('55100000', 2),
  devops: id('55100000', 3),
  sinRequisitos: id('55100000', 4),
} as const;

export const normalizarRequisito = (nombre: string): string =>
  nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');

export const vacantesHu19: Array<Prisma.VacanteCreateManyInput & { id: string }> = [
  {
    id: HU19_VACANCY_IDS.backend,
    id_empresa: DEMO_COMPANY_ID,
    titulo: 'Desarrollador backend Node.js',
    modalidad: 'REMOTO',
    nivel_experiencia: 'SEMI_SENIOR',
    descripcion_tecnica: 'Vacante ficticia: API REST con NestJS, PostgreSQL y pruebas automatizadas.',
    salario: '7000',
    estado: 'PUBLICADO',
    created_at: new Date('2026-11-12T12:00:00Z'),
    fecha_publicacion: new Date('2026-11-12T12:00:00Z'),
  },
  {
    id: HU19_VACANCY_IDS.frontend,
    id_empresa: DEMO_COMPANY_ID,
    titulo: 'Desarrollador frontend React',
    modalidad: 'HIBRIDO',
    nivel_experiencia: 'JUNIOR',
    descripcion_tecnica: 'Vacante ficticia: interfaces con React, TypeScript y Tailwind.',
    salario: '5500',
    estado: 'PUBLICADO',
    created_at: new Date('2026-11-13T12:00:00Z'),
    fecha_publicacion: new Date('2026-11-13T12:00:00Z'),
  },
  {
    id: HU19_VACANCY_IDS.devops,
    id_empresa: DEMO_COMPANY_ID,
    titulo: 'Ingeniero DevOps junior',
    modalidad: 'PRESENCIAL',
    nivel_experiencia: 'JUNIOR',
    descripcion_tecnica: 'Vacante ficticia: Docker, CI/CD y despliegue en la nube.',
    salario: '6000',
    estado: 'PUBLICADO',
    created_at: new Date('2026-11-14T12:00:00Z'),
    fecha_publicacion: new Date('2026-11-14T12:00:00Z'),
  },
  {
    // Sin requisitos técnicos a propósito: la afinidad de sus postulaciones queda sin calcular.
    id: HU19_VACANCY_IDS.sinRequisitos,
    id_empresa: DEMO_COMPANY_ID,
    titulo: 'Asistente de soporte técnico',
    modalidad: 'PRESENCIAL',
    nivel_experiencia: 'JUNIOR',
    descripcion_tecnica: 'Vacante ficticia sin requisitos técnicos cargados.',
    salario: '3500',
    estado: 'PUBLICADO',
    created_at: new Date('2026-11-15T12:00:00Z'),
    fecha_publicacion: new Date('2026-11-15T12:00:00Z'),
  },
];

// Requisitos técnicos por vacante (también para las vacantes de las épicas 4 y 5).
const requisitosPorVacante: Array<[string, string[]]> = [
  [HU19_VACANCY_IDS.backend, ['TypeScript', 'NestJS', 'PostgreSQL', 'Docker', 'Pruebas unitarias']],
  [HU19_VACANCY_IDS.frontend, ['React', 'TypeScript', 'Tailwind CSS', 'Accesibilidad']],
  [HU19_VACANCY_IDS.devops, ['Docker', 'CI/CD', 'Linux', 'AWS']],
  [DEMO_IDS.vacancy, ['TypeScript', 'PostgreSQL', 'Pruebas unitarias']],
  [E4_VACANCY_WITH_APPLICANTS, ['SQL', 'Python', 'Visualización de datos']],
  [E4_VACANCY_EMPTY, ['Pruebas funcionales', 'Selenium', 'Gestión de defectos']],
];

export const requisitosHu19: Prisma.VacanteRequisitoTecnicoCreateManyInput[] = requisitosPorVacante.flatMap(
  ([idVacante, nombres], v) =>
    nombres.map((nombre, i) => ({
      id: id('55150000', v * 10 + i + 1),
      id_vacante: idVacante,
      nombre,
      nombre_normalizado: normalizarRequisito(nombre),
    })),
);

// [nombre, apellido, área, perfil profesional con habilidades]
const perfiles = [
  ['Marcelo', 'Aguilar', AREA_IDS.software, 'TypeScript, NestJS, PostgreSQL, Docker y pruebas unitarias.'],
  ['Natalia', 'Ibáñez', AREA_IDS.software, 'React, TypeScript, Tailwind CSS y accesibilidad web.'],
  ['Omar', 'Lazarte', AREA_IDS.cloudDevops, 'Docker, CI/CD, Linux y AWS.'],
  ['Paola', 'Zeballos', AREA_IDS.dataAi, 'SQL, Python y visualización de datos.'],
  ['Rodrigo', 'Pinto', AREA_IDS.qualityAssurance, 'Pruebas funcionales, Selenium y gestión de defectos.'],
  ['Sofía', 'Gutiérrez', AREA_IDS.itManagement, 'Gestión de proyectos, Scrum y comunicación con clientes.'],
] as const;

const usuarios: Prisma.UsuarioCreateManyInput[] = perfiles.map(([nombre, apellido], i) => ({
  usuario_id: id('55200000', i + 1),
  correo: `${nombre}.${apellido}.hu19@umsspira.local`
    .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(),
  nombre: `${nombre} ${apellido}`,
  rol: 'titulado',
  estado: 'ACTIVO',
}));

const titulados: Prisma.TituladoCreateManyInput[] = perfiles.map(([nombre, apellido], i) => ({
  id: id('55300000', i + 1),
  id_usuario: id('55200000', i + 1),
  id_carrera: DEMO_CAREER_ID,
  nombre,
  apellido,
  grado: 'Licenciatura',
  anio_egreso: 2020 + i,
}));

const perfilesArea: Prisma.PerfilAreaCreateManyInput[] = perfiles.map(([, , area, descripcion], i) => ({
  id: id('55350000', i + 1),
  id_titulado: id('55300000', i + 1),
  area_id: area,
  descripcion_profesional: descripcion,
  fecha_creacion: new Date('2026-11-01T00:00:00Z'),
}));

// [índice de titulado, vacante, afinidad (null = sin calcular), etapa]
const postulaciones: Array<[number, string, number | null, string]> = [
  [0, HU19_VACANCY_IDS.backend, 94, 'preseleccionado'],
  [2, HU19_VACANCY_IDS.backend, 58, 'postulado'],
  [5, HU19_VACANCY_IDS.backend, null, 'postulado'],
  [1, HU19_VACANCY_IDS.frontend, 91, 'en_revision'],
  [0, HU19_VACANCY_IDS.frontend, 63, 'postulado'],
  [2, HU19_VACANCY_IDS.devops, 89, 'entrevista'],
  [3, HU19_VACANCY_IDS.devops, null, 'postulado'],
  [3, E4_VACANCY_EMPTY, 35, 'postulado'],
  [4, E4_VACANCY_EMPTY, 90, 'en_revision'],
  [4, HU19_VACANCY_IDS.sinRequisitos, null, 'postulado'],
  [5, HU19_VACANCY_IDS.sinRequisitos, null, 'en_revision'],
];

export const postulacionesHu19: Prisma.PostulacionCreateManyInput[] = postulaciones.map(
  ([t, idVacante, match, estado], i) => ({
    id: id('55400000', i + 1),
    id_usuario: id('55200000', t + 1),
    id_vacante: idVacante,
    porcentaje_match: match,
    estado,
    // CORRECCIÓN: La fecha de creación siempre se asigna, pero fecha_match solo si hay match
    created_at: new Date(Date.UTC(2026, 10, 14 + (i % 5), 15)),
    fecha_match: match === null ? null : new Date(Date.UTC(2026, 10, 14 + (i % 5), 15)),
  }),
);

export async function seedHu19(prisma: PrismaClient): Promise<void> {
  await prisma.vacante.createMany({ data: vacantesHu19, skipDuplicates: true });
  await prisma.vacanteRequisitoTecnico.createMany({ data: requisitosHu19, skipDuplicates: true });
  await prisma.usuario.createMany({ data: usuarios, skipDuplicates: true });
  await prisma.titulado.createMany({ data: titulados, skipDuplicates: true });
  await prisma.perfilArea.createMany({ data: perfilesArea, skipDuplicates: true });
  await prisma.postulacion.createMany({ data: postulacionesHu19, skipDuplicates: true });
}