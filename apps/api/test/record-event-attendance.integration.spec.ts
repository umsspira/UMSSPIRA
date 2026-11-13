import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type Prisma } from '../src/generated/prisma/client';
import type { PrismaService } from '../src/shared/infrastructure/database/prisma.service';
import type { ActorContext } from '../src/shared/security/contexts/actor-context';
import { ValidateAttendancePassService } from '../src/modules/events/application/validate-attendance-pass.service';
import { EventPassRules } from '../src/modules/events/domain/event-pass.rules';

const connectionString = process.env.HU14_TEST_DATABASE_URL;
if (!connectionString)
  {throw new Error('Configura HU14_TEST_DATABASE_URL para las pruebas de asistencia.');}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString, max: 8 }) });
const service = new ValidateAttendancePassService(prisma as unknown as PrismaService);

describe('T16: persistencia transaccional de asistencia en PostgreSQL', () => {
  jest.setTimeout(30000);
  let fixture: {
    ownerId: string;
    graduateId: string;
    eventId: string;
    registrationId: string;
    token: string;
  };
  let actor: ActorContext;

  beforeAll(async () => {
    fixture = await prisma.$transaction(async (tx) => {
      const owner = await tx.usuario.create({ data: { nombre: 'Administrador de prueba T16' } });
      const graduate = await tx.usuario.create({ data: { nombre: 'Participante de prueba T16' } });
      const event = await tx.evento.create({
        data: {
          id_usuario: owner.usuario_id,
          titulo: 'Evento T16',
          estado: 'PUBLICADO',
          cupo_maximo: 10,
        },
      });
      const registration = await tx.inscripcionEvento.create({
        data: { id_evento: event.id, id_usuario: graduate.usuario_id, estado: 'CONFIRMADA' },
      });
      const token = EventPassRules.generateOpaqueToken();
      await tx.paseQr.create({
        data: { id_inscripcion: registration.id, token_hash: token, estado: 'VIGENTE' },
      });
      return {
        ownerId: owner.usuario_id,
        graduateId: graduate.usuario_id,
        eventId: event.id,
        registrationId: registration.id,
        token,
      };
    });
    actor = {
      id: fixture.ownerId,
      email: 't16@example.com',
      name: 'Administrador',
      role: 'administrador',
      permissions: ['eventos:manage'],
      scopes: { companyIds: [], careerIds: [], graduateId: null },
      credentialVersion: 1,
    };
  });

  beforeEach(async () => {
    await prisma.asistenciaEvento.deleteMany({ where: { id_inscripcion: fixture.registrationId } });
    await prisma.evento.update({
      where: { id: fixture.eventId },
      data: { estado: 'PUBLICADO', fecha_fin: new Date(Date.now() + 3600000) },
    });
    await prisma.inscripcionEvento.update({
      where: { id: fixture.registrationId },
      data: { estado: 'CONFIRMADA' },
    });
    await prisma.paseQr.update({
      where: { id_inscripcion: fixture.registrationId },
      data: { estado: 'VIGENTE', fecha_expiracion: null },
    });
  });

  afterAll(async () => {
    try {
      if (fixture) {
        await prisma.$transaction(async (tx) => {
          await tx.asistenciaEvento.deleteMany({
            where: { id_inscripcion: fixture.registrationId },
          });
          await tx.paseQr.deleteMany({ where: { id_inscripcion: fixture.registrationId } });
          await tx.inscripcionEvento.delete({ where: { id: fixture.registrationId } });
          await tx.evento.delete({ where: { id: fixture.eventId } });
          await tx.usuario.deleteMany({
            where: { usuario_id: { in: [fixture.ownerId, fixture.graduateId] } },
          });
        });
      }
    } finally {
      await prisma.$disconnect();
    }
  });

  it('registra una asistencia ante seis escaneos simultáneos y conserva el cupo y la inscripción', async () => {
    const results = await Promise.all(
      Array.from({ length: 6 }, () => service.execute(actor, fixture.eventId, fixture.token)),
    );
    expect(results.filter((row) => row.code === 'ATTENDANCE_RECORDED')).toHaveLength(1);
    expect(results.filter((row) => row.code === 'ATTENDANCE_ALREADY_RECORDED')).toHaveLength(5);
    expect(new Set(results.map((row) => row.attendedAt)).size).toBe(1);
    expect(
      await prisma.asistenciaEvento.count({ where: { id_inscripcion: fixture.registrationId } }),
    ).toBe(1);
    expect(
      await prisma.asistenciaEvento.findUniqueOrThrow({
        where: { id_inscripcion: fixture.registrationId },
      }),
    ).toMatchObject({ id_usuario_registro: actor.id });
    expect(
      await prisma.inscripcionEvento.findUniqueOrThrow({ where: { id: fixture.registrationId } }),
    ).toMatchObject({
      estado: 'CONFIRMADA',
      id_usuario: fixture.graduateId,
      id_evento: fixture.eventId,
    });
    expect(await prisma.evento.findUniqueOrThrow({ where: { id: fixture.eventId } })).toMatchObject(
      { cupo_maximo: 10 },
    );
  });

  it.each(['inscripcion', 'evento', 'pase', 'vencimiento'])(
    'rechaza %s inválido sin registrar asistencia',
    async (target) => {
      if (target === 'inscripcion')
        {await prisma.inscripcionEvento.update({
          where: { id: fixture.registrationId },
          data: { estado: 'CANCELADA' },
        });}
      if (target === 'evento')
        {await prisma.evento.update({
          where: { id: fixture.eventId },
          data: { estado: 'CANCELADO' },
        });}
      if (target === 'pase')
        {await prisma.paseQr.update({
          where: { id_inscripcion: fixture.registrationId },
          data: { estado: 'INVALIDADO' },
        });}
      if (target === 'vencimiento')
        {await prisma.paseQr.update({
          where: { id_inscripcion: fixture.registrationId },
          data: { fecha_expiracion: new Date(0) },
        });}
      await expect(service.execute(actor, fixture.eventId, fixture.token)).rejects.toThrow();
      expect(
        await prisma.asistenciaEvento.count({ where: { id_inscripcion: fixture.registrationId } }),
      ).toBe(0);
    },
  );

  it('revierte una escritura si la transacción falla y permite reintentar', async () => {
    const failure = new Error('Fallo antes de confirmar la transacción');
    const failingDatabase = {
      $transaction: (run: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
        prisma.$transaction(async (tx) => {
          await run(tx);
          throw failure;
        }),
    };
    const failingService = new ValidateAttendancePassService(
      failingDatabase as unknown as PrismaService,
    );
    await expect(failingService.execute(actor, fixture.eventId, fixture.token)).rejects.toBe(
      failure,
    );
    expect(
      await prisma.asistenciaEvento.count({ where: { id_inscripcion: fixture.registrationId } }),
    ).toBe(0);
    await expect(service.execute(actor, fixture.eventId, fixture.token)).resolves.toMatchObject({
      code: 'ATTENDANCE_RECORDED',
      participantName: 'Participante de prueba T16',
      eventTitle: 'Evento T16',
    });
  });
});
