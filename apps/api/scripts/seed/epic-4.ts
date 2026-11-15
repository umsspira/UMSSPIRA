import type { Prisma, PrismaClient } from '../../src/generated/prisma/client';
import { DEMO_CAREER_ID, DEMO_COMPANY_ID } from './demo-accounts';
import { AREA_IDS, CATALOG_IDS, DEMO_IDS } from './demo-ids';

// Portal de empresas: añadir datos con UUID fijos y referencias a registros ya cargados.
export const empresas: Array<Prisma.EmpresaCreateManyInput & { id: string }> = [];
export const requerimientos: Array<Prisma.RequerimientoLaboralCreateManyInput & { id: string }> = [
  {
    id: DEMO_IDS.requirement,
    id_empresa: DEMO_COMPANY_ID,
    id_modalidad: CATALOG_IDS.hybrid,
    titulo: 'Desarrollador de aplicaciones web',
    descripcion: 'Requerimiento ficticio: TypeScript, PostgreSQL y trabajo en equipo.',
    experiencia_requerida: 'Junior',
    ubicacion: 'Cochabamba',
    fecha_publicacion: new Date(),
    estado: 'PUBLICADO',
  },
];
export const habilidades: Array<Prisma.RequerimientoHabilidadCreateManyInput & { id: string }> = [
  {
    id: '44100000-0000-4000-8000-000000000001',
    id_requerimiento: DEMO_IDS.requirement,
    id_area: AREA_IDS.software,
    nivel_requerimiento: 'Básico',
  },
];
export const telefonos: Array<Prisma.TelefonoEmpresaCreateManyInput & { id: string }> = [
  {
    id: '44200000-0000-4000-8000-000000000001',
    id_empresa: DEMO_COMPANY_ID,
    numero: '70000001',
    tipo: 'PRINCIPAL',
  },
];
export const direcciones: Array<Prisma.DireccionEmpresaCreateManyInput & { id: string }> = [
  {
    id: '44300000-0000-4000-8000-000000000001',
    id_empresa: DEMO_COMPANY_ID,
    departamento: 'Cochabamba',
    direccion: 'Dirección ficticia de demostración',
  },
];
export const sectores: Array<Prisma.SectorEmpresaCreateManyInput & { id: string }> = [
  {
    id: '44400000-0000-4000-8000-000000000001',
    id_empresa: DEMO_COMPANY_ID,
    nombre: 'Tecnología',
    descripcion: 'Desarrollo de software',
    estado: 'ACTIVO',
  },
];
// ---- Sprint 3 · HU-01 / HU-04: vacantes y postulaciones de demostración ----
// Vacantes propias de Épica 4: la de Épica 5 se carga después y no puede usarse aquí.
const e4Id = (prefix: string, n: number) =>
  `${prefix}-0000-4000-8000-${n.toString().padStart(12, '0')}`;

export const E4_VACANCY_WITH_APPLICANTS = e4Id('44500000', 1);
export const E4_VACANCY_EMPTY = e4Id('44500000', 2);
const DEMO_GRADUATE_USER_ID = '20000000-0000-4000-8000-000000000001';

export const vacantesE4: Array<Prisma.VacanteCreateManyInput & { id: string }> = [
  {
    id: E4_VACANCY_WITH_APPLICANTS,
    id_empresa: DEMO_COMPANY_ID,
    titulo: 'Analista de datos junior',
    modalidad: 'REMOTO',
    nivel_experiencia: 'JUNIOR',
    descripcion_tecnica: 'Vacante ficticia: SQL, Python y visualización de datos.',
    salario: '5000',
    estado: 'PUBLICADO',
    created_at: new Date('2026-11-01T12:00:00Z'),
  },
  {
    id: E4_VACANCY_EMPTY,
    id_empresa: DEMO_COMPANY_ID,
    titulo: 'QA tester semi senior',
    modalidad: 'PRESENCIAL',
    nivel_experiencia: 'SEMI_SENIOR',
    descripcion_tecnica: 'Vacante ficticia sin postulantes para probar el estado vacío.',
    salario: '6500',
    estado: 'PUBLICADO',
    created_at: new Date('2026-11-05T12:00:00Z'),
  },
];

// [nombre, apellido, % de afinidad (null = sin calcular, CA-10), etapa HU-04]
const postulantesDemo = [
  ['Ana', 'Rojas', 92, 'preseleccionado'],
  ['Bruno', 'Quispe', 88, 'entrevista'],
  ['Carla', 'Mendoza', 85, 'en_revision'],
  ['Diego', 'Vargas', 81, 'postulado'],
  ['Elena', 'Torrez', 77, 'en_revision'],
  ['Fernando', 'Choque', 74, 'postulado'],
  ['Gabriela', 'Arce', 70, 'descartado'],
  ['Hugo', 'Salazar', 66, 'postulado'],
  ['Isabel', 'Flores', 61, 'en_revision'],
  ['Jorge', 'Camacho', 55, 'postulado'],
  ['Karen', 'Villca', 48, 'descartado'],
  ['Luis', 'Mamani', null, 'postulado'],
] as const;

const usuariosPostulantes: Prisma.UsuarioCreateManyInput[] = postulantesDemo.map(
  ([nombre, apellido], i) => ({
    usuario_id: e4Id('44600000', i + 1),
    correo: `${nombre}.${apellido}.demo@umsspira.local`.toLowerCase(),
    nombre: `${nombre} ${apellido}`,
    rol: 'titulado',
    estado: 'ACTIVO',
  }),
);

const tituladosPostulantes: Prisma.TituladoCreateManyInput[] = postulantesDemo.map(
  ([nombre, apellido], i) => ({
    id: e4Id('44700000', i + 1),
    id_usuario: e4Id('44600000', i + 1),
    id_carrera: DEMO_CAREER_ID,
    nombre,
    apellido,
    grado: 'Licenciatura',
    anio_egreso: 2021 + (i % 5),
  }),
);

export const postulacionesE4: Prisma.PostulacionCreateManyInput[] = [
  ...postulantesDemo.map(([, , match, etapa], i) => ({
    id: e4Id('44800000', i + 1),
    id_usuario: e4Id('44600000', i + 1),
    id_vacante: E4_VACANCY_WITH_APPLICANTS,
    porcentaje_match: match,
    estado: etapa,
    created_at: new Date(Date.UTC(2026, 10, 2 + (i % 9))),
  })),
  // El titulado demo también se postula, para probar con su cuenta.
  {
    id: e4Id('44800000', 13),
    id_usuario: DEMO_GRADUATE_USER_ID,
    id_vacante: E4_VACANCY_WITH_APPLICANTS,
    porcentaje_match: 79,
    estado: 'postulado',
    created_at: new Date('2026-11-10T15:00:00Z'),
  },
];
export async function seedEpic4(prisma: PrismaClient): Promise<void> {
  if (empresas.length > 0) {
    await prisma.empresa.createMany({ data: empresas, skipDuplicates: true });
  }
  const propietarios = await prisma.empresa.findMany({
    where: { id_usuario: { not: null } },
    select: { id: true, id_usuario: true },
  });
  if (propietarios.length > 0) {
    await prisma.empresaUsuario.createMany({
      data: propietarios.map((empresa) => ({
        id_empresa: empresa.id,
        id_usuario: empresa.id_usuario!,
        rol: 'administrador',
        estado: 'activo',
      })),
      skipDuplicates: true,
    });
  }
  await prisma.telefonoEmpresa.createMany({ data: telefonos, skipDuplicates: true });
  await prisma.direccionEmpresa.createMany({ data: direcciones, skipDuplicates: true });
  await prisma.sectorEmpresa.createMany({ data: sectores, skipDuplicates: true });
  await prisma.vacante.createMany({ data: vacantesE4, skipDuplicates: true });
  await prisma.usuario.createMany({ data: usuariosPostulantes, skipDuplicates: true });
  await prisma.titulado.createMany({ data: tituladosPostulantes, skipDuplicates: true });
  await prisma.postulacion.createMany({ data: postulacionesE4, skipDuplicates: true });
  if (requerimientos.length > 0) {
    await prisma.requerimientoLaboral.createMany({ data: requerimientos, skipDuplicates: true });
  }
  if (habilidades.length > 0) {
    await prisma.requerimientoHabilidad.createMany({ data: habilidades, skipDuplicates: true });
  }
}
