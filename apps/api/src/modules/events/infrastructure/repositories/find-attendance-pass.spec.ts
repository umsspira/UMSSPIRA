import type { Prisma } from '../../../../generated/prisma/client';
import { findAttendancePass } from './find-attendance-pass';

describe('findAttendancePass', () => {
  const actor = { id: 'admin', permissions: ['eventos:manage'] };
  const now = new Date('2026-11-14T14:00:00Z');
  const future = new Date(now.getTime() + 1);
  const past = new Date(now.getTime() - 1);
  const event = { id: 'evento', estado: 'PUBLICADO', fecha_fin: future };
  const registration = {
    id: 'inscripcion',
    id_evento: event.id,
    id_usuario: 'titulado',
    estado: 'CONFIRMADA',
  };
  const pass = { estado: 'VIGENTE', fecha_expiracion: null, inscripcion: registration };
  const findEvent = jest.fn();
  const findPass = jest.fn();
  const tx = {
    evento: { findFirst: findEvent },
    paseQr: { findUnique: findPass },
  } as unknown as Prisma.TransactionClient;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);
    findEvent.mockReset().mockResolvedValue(event);
    findPass.mockReset().mockResolvedValue(pass);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it.each([
    ['CANCELADO', 'CONFIRMADA', 'VIGENTE', 'ATTENDANCE_NOT_ALLOWED'],
    ['BORRADOR', 'CONFIRMADA', 'VIGENTE', 'ATTENDANCE_NOT_ALLOWED'],
    ['PUBLICADO', 'CANCELADA', 'VIGENTE', 'ATTENDANCE_NOT_ALLOWED'],
    ['PUBLICADO', null, 'VIGENTE', 'ATTENDANCE_NOT_ALLOWED'],
    ['PUBLICADO', 'CONFIRMADA', 'INVALIDADO', 'PASS_INACTIVE'],
    ['PUBLICADO', 'CONFIRMADA', 'DESCONOCIDO', 'PASS_INACTIVE'],
    ['PUBLICADO', 'CONFIRMADA', 'VENCIDO', 'PASS_EXPIRED'],
  ])(
    'rechaza evento %s, inscripción %s y pase %s',
    async (eventStatus, registrationStatus, passStatus, code) => {
      findEvent.mockResolvedValue({ ...event, estado: eventStatus });
      findPass.mockResolvedValue({
        ...pass,
        estado: passStatus,
        inscripcion: { ...registration, estado: registrationStatus },
      });
      await expect(findAttendancePass(tx, actor, event.id, 'token')).rejects.toMatchObject({
        code,
      });
    },
  );

  it.each([
    [future, now, 'PASS_EXPIRED'],
    [future, past, 'PASS_EXPIRED'],
    [now, future, 'PASS_EXPIRED'],
    [past, null, 'PASS_EXPIRED'],
    [null, future, 'ATTENDANCE_NOT_ALLOWED'],
  ])('comprueba ambos límites temporales (%#)', async (end, expiration, code) => {
    findEvent.mockResolvedValue({ ...event, fecha_fin: end });
    findPass.mockResolvedValue({ ...pass, fecha_expiracion: expiration });
    await expect(findAttendancePass(tx, actor, event.id, 'token')).rejects.toMatchObject({ code });
  });

  it('rechaza al actor sin permiso antes de consultar datos', async () => {
    await expect(
      findAttendancePass(tx, { ...actor, permissions: [] }, event.id, 'token'),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(findEvent).not.toHaveBeenCalled();
    expect(findPass).not.toHaveBeenCalled();
  });

  it('exige un evento propio sin archivar antes de consultar el token', async () => {
    findEvent.mockResolvedValue(null);
    await expect(findAttendancePass(tx, actor, event.id, 'token')).rejects.toMatchObject({
      code: 'EVENT_NOT_FOUND',
    });
    expect(findEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: event.id, id_usuario: actor.id, archivado: false },
      }),
    );
    expect(findPass).not.toHaveBeenCalled();
  });

  it.each([
    null,
    { ...pass, inscripcion: { ...registration, id_usuario: null } },
    { ...pass, inscripcion: { ...registration, id_evento: null } },
  ])('rechaza un pase desconocido o sin vínculos completos (%#)', async (row) => {
    findPass.mockResolvedValue(row);
    await expect(findAttendancePass(tx, actor, event.id, 'token')).rejects.toMatchObject({
      code: 'PASS_NOT_FOUND',
    });
  });

  it('rechaza un pase asociado a otro evento', async () => {
    findPass.mockResolvedValue({ ...pass, inscripcion: { ...registration, id_evento: 'otro' } });
    await expect(findAttendancePass(tx, actor, event.id, 'token')).rejects.toMatchObject({
      code: 'PASS_EVENT_MISMATCH',
    });
  });

  it('busca el token exacto y recupera el pase del evento seleccionado', async () => {
    await expect(findAttendancePass(tx, actor, event.id, 'token')).resolves.toEqual({
      event,
      pass,
    });
    expect(findPass).toHaveBeenCalledWith(
      expect.objectContaining({ where: { token_hash: 'token' } }),
    );
  });
});
