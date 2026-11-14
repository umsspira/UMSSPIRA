import type { Prisma, PrismaClient } from '../../src/generated/prisma/client';
import { DEMO_ACCOUNTS } from './demo-accounts';

export const INFORMATICS_CAREER_ID = '10000000-0000-4000-8000-000000000002';
export const INFORMATICS_ADMIN_ASSIGNMENT_ID = '10000000-0000-4000-8000-000000000005';

const careerNames = new Set([
  'ingenieria informatica',
  'ingenieria en informatica',
  'ing informatica',
  'ingeniera informatica',
]);

function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\./g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

export async function seedInformaticsCareer(
  prisma: Pick<Prisma.TransactionClient, 'carrera'>,
): Promise<string> {
  const careers = await prisma.carrera.findMany({ select: { id: true, nombre: true } });
  const matches = careers.filter((career) => careerNames.has(normalizeName(career.nombre ?? '')));

  if (matches.length > 1) {
    throw new Error('Hay varias carreras de Informática; revisar sus UUID antes de asignar acceso');
  }
  if (matches[0]) {
    return matches[0].id;
  }
  if (careers.some((career) => career.id === INFORMATICS_CAREER_ID)) {
    throw new Error('El UUID previsto para Informática ya pertenece a otra carrera');
  }

  const career = await prisma.carrera.upsert({
    where: { id: INFORMATICS_CAREER_ID },
    create: { id: INFORMATICS_CAREER_ID, nombre: 'Ingeniería Informática' },
    update: {},
    select: { id: true },
  });
  return career.id;
}

export async function seedInformaticsAdmin(prisma: PrismaClient): Promise<string> {
  return prisma.$transaction(async (tx) => {
    const careerId = await seedInformaticsCareer(tx);
    const admin = DEMO_ACCOUNTS.find((account) => account.role === 'administrador')!;
    const user = await tx.usuario.findUnique({
      where: { usuario_id: admin.id },
      select: { rol: true },
    });
    if (!user || user.rol !== 'administrador') {
      throw new Error(
        'Debe existir la cuenta administradora de demostración antes de asignarle Informática',
      );
    }

    const where = { id_usuario: admin.id, id_carrera: careerId };
    const assignment = await tx.administradorDeCarrera.findFirst({
      where,
      select: { id: true },
    });
    if (!assignment) {
      await tx.administradorDeCarrera.createMany({
        data: [
          {
            id: INFORMATICS_ADMIN_ASSIGNMENT_ID,
            ...where,
            estado: 'ACTIVO',
          },
        ],
        skipDuplicates: true,
      });
      const created = await tx.administradorDeCarrera.findFirst({ where, select: { id: true } });
      if (!created) {
        throw new Error('El UUID previsto para la asignación de Informática ya está ocupado');
      }
    }
    return careerId;
  });
}
