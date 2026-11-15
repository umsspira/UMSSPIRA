import type { Prisma, PrismaClient } from '../../src/generated/prisma/client';
import { seedAccessCatalog } from './access-catalog';
import { DEMO_CAREER_ID } from './demo-accounts';
import { AREA_IDS, CATALOG_IDS } from './demo-ids';
import { seedRadarCatalog } from './radar-catalog';
import { runSeedStage } from './seed-stage';
import { seedInformaticsCareer } from './informatics-career';

export const carreras: Array<Prisma.CarreraCreateManyInput & { id: string }> = [
  { id: DEMO_CAREER_ID, nombre: 'Ingeniería de Sistemas' },
];

export const tiposArchivo: Array<Prisma.TipoArchivoCreateManyInput & { id: string }> = [
  { id: CATALOG_IDS.pdf, nombre: 'PDF' },
  { id: CATALOG_IDS.jpg, nombre: 'JPG' },
  { id: CATALOG_IDS.png, nombre: 'PNG' },
];

export const modalidades: Array<Prisma.ModalidadTrabajoCreateManyInput & { id: string }> = [
  { id: CATALOG_IDS.onsite, nombre: 'Presencial' },
  { id: CATALOG_IDS.remote, nombre: 'Remoto' },
  { id: CATALOG_IDS.hybrid, nombre: 'Híbrido' },
];

// N28: valores de la copia; las etiquetas largas del Radar no pertenecen a esta tabla.
export const areas: Array<Prisma.AreaCreateManyInput & { id: string }> = [
  { id: AREA_IDS.technology, nombre: 'Tecnología', padre_id: null },
  { id: AREA_IDS.management, nombre: 'Gestión', padre_id: null },
  { id: AREA_IDS.software, nombre: 'Desarrollo de software', padre_id: null },
  { id: AREA_IDS.data, nombre: 'Análisis de datos', padre_id: AREA_IDS.technology },
  { id: AREA_IDS.projects, nombre: 'Gestión de proyectos', padre_id: AREA_IDS.management },
  { id: AREA_IDS.cloudDevops, nombre: 'Cloud/DevOps', padre_id: null },
  { id: AREA_IDS.dataAi, nombre: 'Ciencia de Datos/IA', padre_id: null },
  { id: AREA_IDS.qualityAssurance, nombre: 'QA', padre_id: null },
  { id: AREA_IDS.cybersecurityNetworks, nombre: 'Ciberseguridad', padre_id: null },
  { id: AREA_IDS.itManagement, nombre: 'Gestión TI', padre_id: null },
];

// HU 6.21: 39 tópicos con los mismos UUID y padres que el SQL del DBA.
export const topicos: Array<Prisma.AreaCreateManyInput & { id: string; nombre: string; padre_id: string }> = [
  { id: '60000000-0000-4000-8000-000000000011', nombre: 'Backend', padre_id: AREA_IDS.technology },
  { id: '60000000-0000-4000-8000-000000000012', nombre: 'Frontend', padre_id: AREA_IDS.technology },
  { id: '60000000-0000-4000-8000-000000000013', nombre: 'Bases de datos', padre_id: AREA_IDS.technology },
  { id: '60000000-0000-4000-8000-000000000014', nombre: 'APIs REST', padre_id: AREA_IDS.technology },
  { id: '60000000-0000-4000-8000-000000000015', nombre: 'Node.js', padre_id: AREA_IDS.technology },
  { id: '60000000-0000-4000-8000-000000000016', nombre: 'React', padre_id: AREA_IDS.technology },
  { id: '60000000-0000-4000-8000-000000000018', nombre: 'PostgreSQL', padre_id: AREA_IDS.technology },
  { id: '60000000-0000-4000-8000-000000000019', nombre: 'Arquitectura de software', padre_id: AREA_IDS.technology },
  { id: '60000000-0000-4000-8000-000000000020', nombre: 'Metodologías ágiles', padre_id: AREA_IDS.management },
  { id: '60000000-0000-4000-8000-000000000021', nombre: 'Liderazgo técnico', padre_id: AREA_IDS.management },
  { id: '60000000-0000-4000-8000-000000000022', nombre: 'Gestión de equipos', padre_id: AREA_IDS.management },
  { id: '60000000-0000-4000-8000-000000000023', nombre: 'Planificación de proyectos', padre_id: AREA_IDS.management },
  { id: '60000000-0000-4000-8000-000000000024', nombre: 'AWS', padre_id: AREA_IDS.cloudDevops },
  { id: '60000000-0000-4000-8000-000000000025', nombre: 'Azure', padre_id: AREA_IDS.cloudDevops },
  { id: '60000000-0000-4000-8000-000000000026', nombre: 'Docker', padre_id: AREA_IDS.cloudDevops },
  { id: '60000000-0000-4000-8000-000000000027', nombre: 'Kubernetes', padre_id: AREA_IDS.cloudDevops },
  { id: '60000000-0000-4000-8000-000000000028', nombre: 'CI/CD', padre_id: AREA_IDS.cloudDevops },
  { id: '60000000-0000-4000-8000-000000000029', nombre: 'Terraform', padre_id: AREA_IDS.cloudDevops },
  { id: '60000000-0000-4000-8000-000000000030', nombre: 'Python para datos', padre_id: AREA_IDS.dataAi },
  { id: '60000000-0000-4000-8000-000000000031', nombre: 'Aprendizaje automático', padre_id: AREA_IDS.dataAi },
  { id: '60000000-0000-4000-8000-000000000032', nombre: 'Análisis exploratorio', padre_id: AREA_IDS.dataAi },
  { id: '60000000-0000-4000-8000-000000000033', nombre: 'Visualización de datos', padre_id: AREA_IDS.dataAi },
  { id: '60000000-0000-4000-8000-000000000034', nombre: 'Procesamiento de lenguaje natural', padre_id: AREA_IDS.dataAi },
  { id: '60000000-0000-4000-8000-000000000035', nombre: 'MLOps', padre_id: AREA_IDS.dataAi },
  { id: '60000000-0000-4000-8000-000000000036', nombre: 'Pruebas manuales', padre_id: AREA_IDS.qualityAssurance },
  { id: '60000000-0000-4000-8000-000000000037', nombre: 'Automatización de pruebas', padre_id: AREA_IDS.qualityAssurance },
  { id: '60000000-0000-4000-8000-000000000038', nombre: 'Pruebas de API', padre_id: AREA_IDS.qualityAssurance },
  { id: '60000000-0000-4000-8000-000000000039', nombre: 'Pruebas de rendimiento', padre_id: AREA_IDS.qualityAssurance },
  { id: '60000000-0000-4000-8000-000000000040', nombre: 'Testing exploratorio', padre_id: AREA_IDS.qualityAssurance },
  { id: '60000000-0000-4000-8000-000000000041', nombre: 'Seguridad de aplicaciones', padre_id: AREA_IDS.cybersecurityNetworks },
  { id: '60000000-0000-4000-8000-000000000042', nombre: 'Pentesting', padre_id: AREA_IDS.cybersecurityNetworks },
  { id: '60000000-0000-4000-8000-000000000043', nombre: 'Gestión de vulnerabilidades', padre_id: AREA_IDS.cybersecurityNetworks },
  { id: '60000000-0000-4000-8000-000000000044', nombre: 'Criptografía aplicada', padre_id: AREA_IDS.cybersecurityNetworks },
  { id: '60000000-0000-4000-8000-000000000045', nombre: 'Respuesta a incidentes', padre_id: AREA_IDS.cybersecurityNetworks },
  { id: '60000000-0000-4000-8000-000000000046', nombre: 'ITIL', padre_id: AREA_IDS.itManagement },
  { id: '60000000-0000-4000-8000-000000000047', nombre: 'Gestión de servicios TI', padre_id: AREA_IDS.itManagement },
  { id: '60000000-0000-4000-8000-000000000048', nombre: 'Gobierno de TI', padre_id: AREA_IDS.itManagement },
  { id: '60000000-0000-4000-8000-000000000049', nombre: 'Gestión de incidentes', padre_id: AREA_IDS.itManagement },
  { id: '60000000-0000-4000-8000-000000000050', nombre: 'Arquitectura empresarial', padre_id: AREA_IDS.itManagement },
];

export const tiposReporte: Array<Prisma.TipoReporteCreateManyInput & { id: string }> = [
  {
    id: CATALOG_IDS.graduateReport,
    nombre: 'Listado de titulados',
    descripcion: 'Solicitudes por carrera y estado de revisión documental',
    disponibilidad: true,
  },
];

export async function seedAreas(prisma: PrismaClient): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Crear faltantes sin renombrar, reubicar ni reactivar registros existentes.
    for (const area of areas) {
      await tx.area.upsert({
        where: { id: area.id },
        create: { ...area, esta_activo: true, fecha_creacion: new Date() },
        update: {},
      });
    }
  }, { maxWait: 10000, timeout: 120000 });
}

export async function seedTopics(prisma: PrismaClient): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('LOCK TABLE public.area IN SHARE ROW EXCLUSIVE MODE');
    const rows = await tx.area.findMany({
      select: { id: true, nombre: true, padre_id: true, esta_activo: true },
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    const normalize = (value: string | null) => (value ?? '').trim().toLocaleLowerCase('es');
    const pending: typeof topicos = [];
    for (const topic of topicos) {
      const parent = byId.get(topic.padre_id);
      if (!parent || parent.padre_id !== null || parent.esta_activo !== true) {
        throw new Error(`HU 6.21: el padre de ${topic.nombre} debe existir como raíz activa`);
      }
      const current = byId.get(topic.id);
      if (current && (current.padre_id !== topic.padre_id || normalize(current.nombre) !== normalize(topic.nombre))) {
        throw new Error(`HU 6.21: UUID ocupado por otro nombre o padre: ${topic.id}`);
      }
      const equivalent = rows.filter(
        (row) => row.padre_id === topic.padre_id && normalize(row.nombre) === normalize(topic.nombre),
      );
      if (equivalent.length > 1) {
        throw new Error(`HU 6.21: tópicos duplicados en la misma área: ${topic.nombre}`);
      }
      if (equivalent.some((row) => row.esta_activo !== true)) {
        throw new Error(`HU 6.21: el tópico equivalente está inactivo: ${topic.nombre}`);
      }
      if (!equivalent.length) {pending.push(topic);}
    }
    if (pending.length) {
      const fecha_creacion = new Date();
      await tx.area.createMany({
        data: pending.map((topic) => ({ ...topic, esta_activo: true, fecha_creacion })),
      });
    }
  }, { maxWait: 10000, timeout: 120000 });
}

export async function seedCatalogs(prisma: PrismaClient): Promise<void> {
  // Acceso conserva su transacción y semántica; T1.9 usa el script dirigido.
  await runSeedStage('acceso', () => seedAccessCatalog(prisma));
  await runSeedStage('catálogos auxiliares', async () => {
    await prisma.$transaction([
      prisma.carrera.createMany({ data: carreras, skipDuplicates: true }),
      prisma.tipoArchivo.createMany({ data: tiposArchivo, skipDuplicates: true }),
      prisma.modalidadTrabajo.createMany({ data: modalidades, skipDuplicates: true }),
      prisma.tipoReporte.createMany({ data: tiposReporte, skipDuplicates: true }),
    ]);
    await seedInformaticsCareer(prisma);
  });
  await runSeedStage('áreas', () => seedAreas(prisma));
  await runSeedStage('tópicos de mentoría', () => seedTopics(prisma));
  await runSeedStage('diccionario Radar', () => seedRadarCatalog(prisma));
}
