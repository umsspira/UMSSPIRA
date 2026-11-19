import { ListUserPassesService } from './list-user-passes.service';

describe('ListUserPassesService', () => {
  it('consulta los pases del titular y conserva sus datos', async () => {
    const usuarioId = 'usuario-1';
    const findMany = jest.fn().mockResolvedValue([
      {
        id: 'pase-1',
        id_inscripcion: 'inscripcion-1',
        token_hash: 'token-de-prueba',
        estado: 'VIGENTE',
        fecha_generacion: new Date('2026-01-01T00:00:00Z'),
        fecha_expiracion: new Date('2099-12-31T00:00:00Z'),
        inscripcion: {
          id_evento: 'evento-1',
          estado: 'CONFIRMADA',
          usuario: {
            nombre: 'Nombre de cuenta',
            titulado: { nombre: 'Ana', apellido: 'Rojas' },
          },
          evento: {
            titulo: 'Evento de prueba',
            estado: 'PUBLICADO',
            fecha_inicio: new Date('2099-12-30T00:00:00Z'),
            fecha_fin: new Date('2099-12-31T00:00:00Z'),
            ubicacion: 'Auditorio',
          },
        },
      },
    ]);

    const prisma = { paseQr: { findMany } };
    const servicio = new ListUserPassesService(prisma as never);

    const resultado = await servicio.execute(usuarioId);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { inscripcion: { id_usuario: usuarioId } },
      }),
    );
    expect(resultado).toHaveLength(1);
    expect(resultado[0]).toMatchObject({
      id: 'pase-1',
      registrationId: 'inscripcion-1',
      eventId: 'evento-1',
      userId: usuarioId,
      qrToken: 'token-de-prueba',
      status: 'ACTIVO',
      isValidForAccess: true,
      eventDetails: {
        name: 'Evento de prueba',
        userName: 'Ana Rojas',
        location: 'Auditorio',
      },
    });
  });
});
