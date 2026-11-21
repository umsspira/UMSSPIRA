import { ForbiddenException } from '@nestjs/common';
import { BusinessRuleError } from '../../shared/errors/business-rule-error';
import { VacantesService } from './vacantes.service';

// HU-03: postulación del titulado a una vacante disponible con su perfil profesional.
describe('VacantesService · postulación a vacantes (HU-03)', () => {
  const ID_VACANTE = '44500000-0000-4000-8000-000000000001';
  const ID_USUARIO = '20000000-0000-4000-8000-000000000003';
  const ID_POSTULACION = '44800000-0000-4000-8000-000000000001';

  function tituladoCompleto(overrides: Record<string, unknown> = {}) {
    return {
      id: '55000000-0000-4000-8000-000000000001',
      formacion_academica_registros: [{ id: 'form-1' }],
      experiencia_laboral_registros: [{ id: 'exp-1' }],
      certificacion_registros: [{ id: 'cert-1' }],
      proyecto_registros: [{ id: 'proy-1' }],
      perfil_area_registros: [{ id: 'area-1', descripcion_profesional: 'Perfil profesional' }],
      ...overrides,
    };
  }

  function crearServicio(
    opts: {
      titulado?: unknown;
      postulacionPrevia?: unknown;
      postulacionEnTransaccion?: unknown;
      vacante?: unknown;
    } = {},
  ) {
    const calculatedAt = '2026-11-20T12:00:00.000Z';
    const calculateAffinity = {
      execute: jest.fn().mockResolvedValue([
        {
          vacancyId: ID_VACANTE,
          result: { status: 'ready', percentage: 80, calculatedAt, comparison: [] },
        },
      ]),
    };
    const affinityData = {
      readProfiles: jest.fn().mockResolvedValue([{ userId: ID_USUARIO }]),
      readRequirements: jest
        .fn()
        .mockResolvedValue([{ vacancyId: ID_VACANTE, requirements: ['Java'] }]),
    };
    const tx = {
      $executeRaw: jest.fn().mockResolvedValue([]),
      $queryRaw: jest.fn().mockResolvedValue([{ id: '55000000-0000-4000-8000-000000000001' }]),
      vacante: { findUnique: jest.fn().mockResolvedValue(opts.vacante === undefined
        ? { estado: 'PUBLICADA', fecha_cierre: null } : opts.vacante) },
      postulacion: {
        findFirst: jest.fn().mockResolvedValue(opts.postulacionEnTransaccion ?? null),
        create: jest.fn().mockResolvedValue({ id: ID_POSTULACION }),
      },
    };
    const prisma = {
      titulado: {
        findFirst: jest.fn().mockResolvedValue(
          opts.titulado === undefined ? tituladoCompleto() : opts.titulado,
        ),
      },
      postulacion: {
        findFirst: jest.fn().mockResolvedValue(opts.postulacionPrevia ?? null),
      },
      vacante: {
        findUnique: jest.fn().mockResolvedValue(
          opts.vacante === undefined
            ? { id: ID_VACANTE, estado: 'PUBLICADA', fecha_cierre: null }
            : opts.vacante,
        ),
      },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(tx)),
    };
    return {
      servicio: new VacantesService(
        prisma as never,
        calculateAffinity as never,
        affinityData as never,
        {} as never,
        affinityData as never,
      ),
      prisma,
      tx,
      calculateAffinity,
      affinityData,
    };
  }

  describe('postular', () => {
    it('crea la postulación enlazando al titulado con la vacante disponible', async () => {
      const { servicio, prisma, tx, calculateAffinity, affinityData } = crearServicio();

      await expect(servicio.postular(ID_VACANTE, ID_USUARIO)).resolves.toEqual({
        postulada: true,
        yaExistia: false,
      });
      expect(tx.$executeRaw).toHaveBeenCalled();
      expect(tx.postulacion.create).toHaveBeenCalledWith({
        data: {
          id_usuario: ID_USUARIO,
          id_vacante: ID_VACANTE,
          estado: 'postulado',
          created_at: expect.any(Date),
          porcentaje_match: 80,
          fecha_match: new Date('2026-11-20T12:00:00.000Z'),
          hash_entrada: expect.stringMatching(/^[0-9a-f]{64}$/),
          estado_match: 'ready',
        },
      });
      expect(affinityData.readProfiles).toHaveBeenCalledWith([ID_USUARIO]);
      expect(affinityData.readRequirements).toHaveBeenCalledWith([ID_VACANTE]);
      expect(calculateAffinity.execute).toHaveBeenCalled();
      expect(prisma.vacante.findUnique).toHaveBeenCalledWith({
        where: { id: ID_VACANTE },
        select: { id: true, estado: true, fecha_cierre: true },
      });
    });

    it('acepta estados PUBLICADO y ACTIVA con fecha de cierre futura', async () => {
      for (const estado of ['PUBLICADO', 'ACTIVA', 'ACTIVO']) {
        const { servicio, tx } = crearServicio({
          vacante: { id: ID_VACANTE, estado, fecha_cierre: new Date(Date.now() + 60_000) },
        });

        await expect(servicio.postular(ID_VACANTE, ID_USUARIO)).resolves.toEqual({
          postulada: true,
          yaExistia: false,
        });
        expect(tx.postulacion.create).toHaveBeenCalledTimes(1);
      }
    });

    it('rechaza a quien no es titulado', async () => {
      const { servicio, tx } = crearServicio({ titulado: null });

      await expect(servicio.postular(ID_VACANTE, ID_USUARIO)).rejects.toThrow(
        ForbiddenException,
      );
      expect(tx.postulacion.create).not.toHaveBeenCalled();
    });

    it('exige perfil profesional completo antes de postular', async () => {
      const { servicio, tx } = crearServicio({
        titulado: tituladoCompleto({ proyecto_registros: [] }),
      });

      await expect(servicio.postular(ID_VACANTE, ID_USUARIO)).rejects.toMatchObject({
        reason: 'conflict',
        code: 'PROFILE_INCOMPLETE',
      });
      await expect(servicio.postular(ID_VACANTE, ID_USUARIO)).rejects.toThrow(
        BusinessRuleError,
      );
      expect(tx.postulacion.create).not.toHaveBeenCalled();
    });

    it('exige descripción profesional no vacía en el perfil', async () => {
      const { servicio } = crearServicio({
        titulado: tituladoCompleto({
          perfil_area_registros: [{ id: 'area-1', descripcion_profesional: '   ' }],
        }),
      });

      await expect(servicio.postular(ID_VACANTE, ID_USUARIO)).rejects.toMatchObject({
        code: 'PROFILE_INCOMPLETE',
      });
    });

    it('rechaza vacantes cerradas o con fecha de cierre vencida', async () => {
      const { servicio: cerrada } = crearServicio({
        vacante: { id: ID_VACANTE, estado: 'CERRADA', fecha_cierre: null },
      });
      await expect(cerrada.postular(ID_VACANTE, ID_USUARIO)).rejects.toMatchObject({
        code: 'JOB_POSTING_UNAVAILABLE',
      });

      const { servicio: vencida } = crearServicio({
        vacante: { id: ID_VACANTE, estado: 'PUBLICADA', fecha_cierre: new Date(Date.now() - 60_000) },
      });
      await expect(vencida.postular(ID_VACANTE, ID_USUARIO)).rejects.toMatchObject({
        code: 'JOB_POSTING_UNAVAILABLE',
      });

      const { servicio: inexistente } = crearServicio({ vacante: null });
      await expect(inexistente.postular(ID_VACANTE, ID_USUARIO)).rejects.toMatchObject({
        code: 'JOB_POSTING_UNAVAILABLE',
      });
    });

    it('es idempotente cuando la postulación ya existe', async () => {
      const { servicio, prisma, tx, calculateAffinity } = crearServicio({
        postulacionPrevia: { id: ID_POSTULACION },
      });

      await expect(servicio.postular(ID_VACANTE, ID_USUARIO)).resolves.toEqual({
        postulada: true,
        yaExistia: true,
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(tx.postulacion.create).not.toHaveBeenCalled();
      expect(calculateAffinity.execute).not.toHaveBeenCalled();
    });

    it('continúa la postulación sin afinidad cuando falla el cálculo técnico', async () => {
      const { servicio, tx, calculateAffinity } = crearServicio();
      calculateAffinity.execute.mockRejectedValueOnce(new Error('NLP no disponible'));

      await expect(servicio.postular(ID_VACANTE, ID_USUARIO)).resolves.toEqual({
        postulada: true,
        yaExistia: false,
      });
      expect(tx.postulacion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ porcentaje_match: null, fecha_match: null }),
      });
    });

    it('resuelve la carrera de postulaciones simultáneas dentro de la transacción', async () => {
      const { servicio, tx } = crearServicio({
        postulacionEnTransaccion: { id: ID_POSTULACION },
      });

      await expect(servicio.postular(ID_VACANTE, ID_USUARIO)).resolves.toEqual({
        postulada: true,
        yaExistia: true,
      });
      expect(tx.$executeRaw).toHaveBeenCalled();
      expect(tx.postulacion.create).not.toHaveBeenCalled();
    });
  });

  describe('estadoPostulacion', () => {
    it('informa que el titulado ya se postuló', async () => {
      const { servicio } = crearServicio({ postulacionPrevia: { id: ID_POSTULACION } });

      await expect(servicio.estadoPostulacion(ID_VACANTE, ID_USUARIO)).resolves.toEqual({
        postulada: true,
      });
    });

    it('informa que no hay postulación registrada', async () => {
      const { servicio } = crearServicio();

      await expect(servicio.estadoPostulacion(ID_VACANTE, ID_USUARIO)).resolves.toEqual({
        postulada: false,
      });
    });

    it('rechaza la consulta de quien no es titulado', async () => {
      const { servicio } = crearServicio({ titulado: null });

      await expect(servicio.estadoPostulacion(ID_VACANTE, ID_USUARIO)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
