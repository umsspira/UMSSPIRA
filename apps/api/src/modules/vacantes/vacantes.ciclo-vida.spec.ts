import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BusinessRuleError } from '../../shared/errors/business-rule-error';
import { VacantesService } from './vacantes.service';

// HU-14: ciclo de vida de la vacante (pausar / reanudar / cerrar / eliminar) con permisos.
describe('VacantesService · ciclo de vida con permisos (HU-14)', () => {
  const ID_VACANTE = '44500000-0000-4000-8000-000000000001';
  const ID_RECLUTADOR = '20000000-0000-4000-8000-000000000003';
  const ID_OTRO_RECLUTADOR = '20000000-0000-4000-8000-000000000099';

  function crearServicio(vacante: { id: string; estado: string | null } | null, postulantes = 0) {
    // actualizarVacante guarda dentro de una transacción con bloqueo por vacante.
    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(0),
      vacante: {
        update: jest.fn().mockResolvedValue(vacante),
        findUniqueOrThrow: jest.fn().mockResolvedValue(vacante),
        findFirst: jest.fn().mockResolvedValue(vacante),
      },
      vacanteRequisitoTecnico: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
      vacante: {
        count: jest.fn().mockResolvedValue(vacante ? 1 : 0),
        findFirst: jest.fn().mockResolvedValue(vacante),
        findUniqueOrThrow: jest.fn().mockResolvedValue(vacante),
        update: jest.fn().mockImplementation(({ data }: { data: { estado?: string } }) =>
          Promise.resolve({ id: ID_VACANTE, estado: data.estado }),
        ),
        delete: jest.fn().mockResolvedValue({ id: ID_VACANTE }),
      },
      postulacion: { count: jest.fn().mockResolvedValue(postulantes) },
    };
    return { servicio: new VacantesService(prisma as never, {} as never, {} as never, {} as never, {} as never), prisma };
  }

  describe('cerrarVacante', () => {
    it('cierra una vacante publicada de su empresa', async () => {
      const { servicio, prisma } = crearServicio({ id: ID_VACANTE, estado: 'PUBLICADO' });

      await expect(servicio.cerrarVacante(ID_VACANTE, ID_RECLUTADOR)).resolves.toEqual({
        id: ID_VACANTE,
        estado: 'CERRADO',
      });
      expect(prisma.vacante.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: ID_VACANTE },
          data: expect.objectContaining({ estado: 'CERRADO' }),
        }),
      );
    });

    it('filtra por empresa del actor: dueño o usuario activo invitado', async () => {
      const { servicio, prisma } = crearServicio({ id: ID_VACANTE, estado: 'PUBLICADO' });

      await servicio.cerrarVacante(ID_VACANTE, ID_RECLUTADOR);

      expect(prisma.vacante.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: ID_VACANTE,
            empresa: {
              OR: [
                { id_usuario: ID_RECLUTADOR },
                { empresa_usuario_registros: { some: { id_usuario: ID_RECLUTADOR, estado: 'activo' } } },
              ],
            },
          },
        }),
      );
    });

    it('NO cierra una vacante de otra empresa (404 y sin escribir)', async () => {
      const { servicio, prisma } = crearServicio(null);

      await expect(servicio.cerrarVacante(ID_VACANTE, ID_OTRO_RECLUTADOR)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.vacante.update).not.toHaveBeenCalled();
    });

    it('es idempotente: cerrar una vacante ya cerrada no vuelve a escribir', async () => {
      const { servicio, prisma } = crearServicio({ id: ID_VACANTE, estado: 'CERRADA' });

      await expect(servicio.cerrarVacante(ID_VACANTE, ID_RECLUTADOR)).resolves.toEqual({
        id: ID_VACANTE,
        estado: 'CERRADO',
      });
      expect(prisma.vacante.update).not.toHaveBeenCalled();
    });
  });

  describe('actualizarVacante · cambios de estado', () => {
    it('pausa una vacante publicada y guarda el estado canónico', async () => {
      const { servicio, prisma } = crearServicio({ id: ID_VACANTE, estado: 'ACTIVA' });

      await servicio.actualizarVacante(ID_VACANTE, ID_RECLUTADOR, { estado: 'PAUSADA' });

      expect(prisma.vacante.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ estado: 'PAUSADO' }) }),
      );
    });

    it('reanuda una vacante pausada', async () => {
      const { servicio, prisma } = crearServicio({ id: ID_VACANTE, estado: 'PAUSADO' });

      await servicio.actualizarVacante(ID_VACANTE, ID_RECLUTADOR, { estado: 'PUBLICADO' });

      expect(prisma.vacante.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ estado: 'PUBLICADO' }) }),
      );
    });

    it('rechaza reabrir una vacante cerrada (409)', async () => {
      const { servicio, prisma } = crearServicio({ id: ID_VACANTE, estado: 'CERRADO' });

      await expect(
        servicio.actualizarVacante(ID_VACANTE, ID_RECLUTADOR, { estado: 'PUBLICADO' }),
      ).rejects.toMatchObject({
        reason: 'conflict',
        code: 'INVALID_JOB_POSTING_STATUS_TRANSITION',
      });
      expect(prisma.vacante.update).not.toHaveBeenCalled();
    });

    it('rechaza un estado inventado (400)', async () => {
      const { servicio, prisma } = crearServicio({ id: ID_VACANTE, estado: 'PUBLICADO' });

      await expect(
        servicio.actualizarVacante(ID_VACANTE, ID_RECLUTADOR, { estado: 'LO_QUE_SEA' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.vacante.update).not.toHaveBeenCalled();
    });

    it('NO edita una vacante de otra empresa (404 y sin escribir)', async () => {
      const { servicio, prisma } = crearServicio(null);

      await expect(
        servicio.actualizarVacante(ID_VACANTE, ID_OTRO_RECLUTADOR, { titulo: 'Hackeada' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.vacante.update).not.toHaveBeenCalled();
    });
  });

  describe('eliminarVacante', () => {
    it('elimina una vacante propia sin postulantes', async () => {
      const { servicio, prisma } = crearServicio({ id: ID_VACANTE, estado: 'PAUSADO' }, 0);

      await servicio.eliminarVacante(ID_VACANTE, ID_RECLUTADOR);

      expect(prisma.vacante.delete).toHaveBeenCalledWith({ where: { id: ID_VACANTE } });
    });

    it('NO elimina una vacante con postulantes (409): hay que cerrarla', async () => {
      const { servicio, prisma } = crearServicio({ id: ID_VACANTE, estado: 'PUBLICADO' }, 3);

      const error = await servicio.eliminarVacante(ID_VACANTE, ID_RECLUTADOR).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(BusinessRuleError);
      expect(error).toMatchObject({ reason: 'conflict', code: 'JOB_POSTING_HAS_APPLICANTS' });
      expect(prisma.vacante.delete).not.toHaveBeenCalled();
    });

    it('NO elimina una vacante de otra empresa (404 y sin borrar)', async () => {
      const { servicio, prisma } = crearServicio(null);

      await expect(servicio.eliminarVacante(ID_VACANTE, ID_OTRO_RECLUTADOR)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.vacante.delete).not.toHaveBeenCalled();
    });
  });
});