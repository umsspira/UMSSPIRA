import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { EventPassRules } from '../src/modules/events/domain/event-pass.rules';
import { findAttendancePass } from '../src/modules/events/infrastructure/repositories/find-attendance-pass';

const connectionString = process.env.HU14_TEST_DATABASE_URL ?? process.env.HU76_TEST_DATABASE_URL;
if (!connectionString)
  {throw new Error('Configura HU14_TEST_DATABASE_URL para la prueba de asistencia.');}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

describe('HU14: validar un pase con PostgreSQL', () => {
  afterAll(() => prisma.$disconnect());

  it('resuelve el token y comprueba propietario, evento y vigencia con las relaciones almacenadas', async () => {
    const rollback = new Error('Revertir los datos temporales de la prueba');
    await expect(
      prisma.$transaction(async (tx) => {
        const owner = await tx.usuario.create({ data: { nombre: 'Administrador HU14' } });
        const graduate = await tx.usuario.create({ data: { nombre: 'Titulado HU14' } });
        const actor = { id: owner.usuario_id, permissions: ['eventos:manage'] };
        const eventData = {
          id_usuario: actor.id,
          estado: 'PUBLICADO',
          archivado: false,
          fecha_fin: new Date(Date.now() + 3_600_000),
        };
        const event = await tx.evento.create({ data: { ...eventData, titulo: 'Evento HU14' } });
        const other = await tx.evento.create({
          data: { ...eventData, titulo: 'Otro evento HU14' },
        });
        const registration = await tx.inscripcionEvento.create({
          data: { id_usuario: graduate.usuario_id, id_evento: event.id, estado: 'CONFIRMADA' },
        });
        const token = EventPassRules.generateOpaqueToken();
        await tx.paseQr.create({
          data: { id_inscripcion: registration.id, token_hash: token, estado: 'VIGENTE' },
        });

        await expect(findAttendancePass(tx, actor, event.id, token)).resolves.toMatchObject({
          event: { id: event.id },
          pass: { inscripcion: { id: registration.id, id_usuario: graduate.usuario_id } },
        });
        await expect(
          findAttendancePass(tx, { ...actor, id: graduate.usuario_id }, event.id, token),
        ).rejects.toMatchObject({ code: 'EVENT_NOT_FOUND' });
        await expect(findAttendancePass(tx, actor, other.id, token)).rejects.toMatchObject({
          code: 'PASS_EVENT_MISMATCH',
        });
        await expect(
          findAttendancePass(tx, actor, event.id, EventPassRules.generateOpaqueToken()),
        ).rejects.toMatchObject({ code: 'PASS_NOT_FOUND' });
        await tx.inscripcionEvento.update({
          where: { id: registration.id },
          data: { estado: 'CANCELADA' },
        });
        await expect(findAttendancePass(tx, actor, event.id, token)).rejects.toMatchObject({
          code: 'ATTENDANCE_NOT_ALLOWED',
        });

        throw rollback;
      }),
    ).rejects.toBe(rollback);
  });
});
