import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { Argon2PasswordHasher } from '../../src/modules/auth/infrastructure/security/argon2-password.hasher';
import { createDatabaseClient } from '../database-client';

const graduateSchema = z
  .object({
    email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
    password: z.string().min(15).max(128),
    name: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100).optional(),
    careerId: z.uuid().optional(),
  })
  .strict();

/**
 * Crea una cuenta de titulado sin perfil de mentor.
 * Sirve para probar el onboarding desde cero; no altera cuentas existentes.
 */
async function createGraduate(): Promise<void> {
  const input = graduateSchema.parse(JSON.parse(readFileSync(0, 'utf8')));
  const prisma = createDatabaseClient();
  try {
    const role = await prisma.rolAcceso.findUnique({ where: { codigo: 'titulado' } });
    if (!role?.habilitado) {
      throw new Error('El rol titulado no está disponible');
    }

    const career = input.careerId
      ? await prisma.carrera.findUnique({
          where: { id: input.careerId },
          select: { id: true, nombre: true },
        })
      : await prisma.carrera.findFirst({
          orderBy: { id: 'asc' },
          select: { id: true, nombre: true },
        });
    if (!career) {
      throw new Error('No hay carreras disponibles para asociar al titulado');
    }

    const existing = await prisma.usuario.findUnique({
      where: { correo: input.email },
      select: {
        usuario_id: true,
        rol: true,
        titulado: { select: { id: true, mentor: { select: { id: true } } } },
      },
    });
    if (existing) {
      if (existing.rol !== 'titulado' || !existing.titulado) {
        throw new Error('El correo ya existe y no corresponde a un titulado');
      }
      console.info(
        JSON.stringify({
          created: false,
          id: existing.usuario_id,
          graduateId: existing.titulado.id,
          email: input.email,
          career: career.nombre,
          hasMentor: Boolean(existing.titulado.mentor),
        }),
      );
      return;
    }

    const passwordHash = await new Argon2PasswordHasher().hash(input.password);
    const user = await prisma.usuario.create({
      data: {
        usuario_id: randomUUID(),
        correo: input.email,
        nombre: input.name,
        rol: 'titulado',
        estado: 'ACTIVO',
        cuenta_acceso: { create: { password_hash: passwordHash } },
        titulado: {
          create: {
            nombre: input.name,
            apellido: input.lastName ?? null,
            id_carrera: career.id,
          },
        },
      },
      select: {
        usuario_id: true,
        correo: true,
        titulado: { select: { id: true } },
      },
    });
    console.info(
      JSON.stringify({
        created: true,
        id: user.usuario_id,
        graduateId: user.titulado?.id,
        email: user.correo,
        career: career.nombre,
        hasMentor: false,
      }),
    );
  } finally {
    await prisma.$disconnect();
  }
}

void createGraduate().catch(() => {
  console.error(
    'No se pudo crear el titulado. Revisa la entrada, el rol, la carrera y la unicidad del correo.',
  );
  process.exitCode = 1;
});
