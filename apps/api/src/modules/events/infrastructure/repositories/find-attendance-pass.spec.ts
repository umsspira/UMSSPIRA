import type { Prisma } from '../../../../generated/prisma/client';
import { findAttendancePass } from './find-attendance-pass';

describe('findAttendancePass', () => {
  const actor = { id: 'admin', permissions: ['eventos:manage'] };
  const event = { id: 'evento', estado: 'PUBLICADO', fecha_fin: null };
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
    findEvent.mockReset().mockResolvedValue(event);
    findPass.mockReset().mockResolvedValue(pass);
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
