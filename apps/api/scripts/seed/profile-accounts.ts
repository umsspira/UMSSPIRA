import type { PrismaClient } from '../../src/generated/prisma/client';
import type { PasswordHasher } from '../../src/modules/auth/application/ports/password-hasher.port';
import { Argon2PasswordHasher } from '../../src/modules/auth/infrastructure/security/argon2-password.hasher';
import { DEMO_CAREER_ID } from './demo-accounts';

// Cuentas de titulado para probar el perfil (Épica 2) con tres estados distintos:
// titulado2 con el perfil vacío, titulado3 con el perfil completo y titulado4 con el perfil parcial.
// Son datos ficticios. No se tocan las cuentas de `demo-accounts.ts`.
export interface ProfileTestAccount {
  id: string;
  profileId: string;
  email: string;
  password: string;
  nombre: string;
  apellido: string;
}

export const PROFILE_TEST_ACCOUNTS: readonly ProfileTestAccount[] = [
  {
    id: '20000000-0000-4000-8000-000000000005',
    profileId: '10000000-0000-4000-8000-000000000021',
    email: 'titulado2@umss.edu.bo',
    password: 'pruebaTitulado2',
    nombre: 'Titulado',
    apellido: 'Dos',
  },
  {
    id: '20000000-0000-4000-8000-000000000006',
    profileId: '10000000-0000-4000-8000-000000000022',
    email: 'titulado3@umss.edu.bo',
    password: 'pruebaTitulado3',
    nombre: 'Titulado',
    apellido: 'Tres',
  },
  {
    id: '20000000-0000-4000-8000-000000000007',
    profileId: '10000000-0000-4000-8000-000000000023',
    email: 'titulado4@umss.edu.bo',
    password: 'pruebaTitulado4',
    nombre: 'Titulado',
    apellido: 'Cuatro',
  },
];

const [, FULL, PARTIAL] = PROFILE_TEST_ACCOUNTS;

export async function seedProfileTestAccounts(
  prisma: PrismaClient,
  passwords: Pick<PasswordHasher, 'hash'> = new Argon2PasswordHasher(),
): Promise<void> {
  for (const account of PROFILE_TEST_ACCOUNTS) {
    const existing = await prisma.usuario.findUnique({
      where: { correo: account.email },
      select: { usuario_id: true },
    });
    if (existing && existing.usuario_id !== account.id) {
      throw new Error('El seed de demostración: un correo de prueba ya pertenece a otra cuenta');
    }
    if (existing) {
      continue;
    }

    await prisma.usuario.create({
      data: {
        usuario_id: account.id,
        correo: account.email,
        nombre: `${account.nombre} ${account.apellido}`,
        rol: 'titulado',
        estado: 'ACTIVO',
        cuenta_acceso: { create: { password_hash: await passwords.hash(account.password) } },
        titulado: {
          create: {
            id: account.profileId,
            nombre: account.nombre,
            apellido: account.apellido,
            grado: 'Licenciatura',
            anio_egreso: 2024,
            carrera: { connect: { id: DEMO_CAREER_ID } },
          },
        },
      },
    });
  }

  // titulado2 queda sin registros a propósito: es el caso del perfil vacío.

  // titulado3: perfil completo (las cuatro secciones; la certificación queda sin respaldo)
  await prisma.formacionAcademica.createMany({
    data: [
      {
        id: '23000000-0000-4000-8000-000000000001',
        id_titulado: FULL.profileId,
        institucion: 'Universidad Mayor de San Simón',
        titulo: 'Ingeniería de Sistemas',
        grado: 'Licenciatura',
        anio_egreso: 2025,
      },
      // titulado4: perfil parcial (solo formación académica)
      {
        id: '23000000-0000-4000-8000-000000000002',
        id_titulado: PARTIAL.profileId,
        institucion: 'Universidad Mayor de San Simón',
        titulo: 'Ingeniería Informática',
        grado: 'Licenciatura',
        anio_egreso: 2023,
      },
    ],
    skipDuplicates: true,
  });
  await prisma.experienciaLaboral.createMany({
    data: [
      {
        id: '23000000-0000-4000-8000-000000000003',
        id_titulado: FULL.profileId,
        empresa: 'Jalasoft',
        cargo: 'Desarrollador Backend',
        fecha_inicio: new Date('2023-02-01T00:00:00Z'),
        fecha_fin: null,
      },
    ],
    skipDuplicates: true,
  });
  await prisma.certificacion.createMany({
    data: [
      {
        id: '23000000-0000-4000-8000-000000000004',
        id_titulado: FULL.profileId,
        nombre: 'AWS Cloud Practitioner',
        entidad_emisora: 'Amazon Web Services',
        grado: 'Profesional',
        anio_emision: 2024,
        estado_validacion: 'sin_respaldo',
      },
    ],
    skipDuplicates: true,
  });
  await prisma.proyecto.createMany({
    data: [
      {
        id: '23000000-0000-4000-8000-000000000005',
        id_titulado: FULL.profileId,
        nombre: 'Portafolio personal',
        enlace: 'https://example.com',
        descripcion: 'Sitio con mis trabajos en React y TypeScript',
        tecnologias: 'React, TypeScript',
      },
      {
        id: '23000000-0000-4000-8000-000000000006',
        id_titulado: FULL.profileId,
        nombre: 'UMSSPIRA, sitio oficial',
        enlace: 'https://umsspira-sooty.vercel.app',
        descripcion:
          'Sitio desplegado de UMSSPIRA donde egresados, empresas y la universidad usan la plataforma.',
        tecnologias: 'Next.js, NestJS, PostgreSQL, Prisma, Vercel',
      },
      {
        id: '23000000-0000-4000-8000-000000000007',
        id_titulado: FULL.profileId,
        nombre: 'UMSSPIRA, plataforma de egresados',
        enlace: 'https://github.com/umsspira/UMSSPIRA',
        descripcion:
          'Repositorio de la plataforma de egresados de la UMSS: perfil profesional, radar de afinidad, eventos y vacantes.',
        tecnologias: 'Next.js, NestJS, PostgreSQL, Prisma',
      },
    ],
    skipDuplicates: true,
  });
}
