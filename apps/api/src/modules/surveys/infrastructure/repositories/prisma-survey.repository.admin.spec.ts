import { PrismaSurveyRepository } from './prisma-survey.repository';

const assignment = { id: 'assignment-1', id_carrera: 'career-1' };

describe('PrismaSurveyRepository gestión administrativa', () => {
  it('crea una encuesta como borrador dentro de la carrera del administrador', async () => {
    const create = jest.fn().mockResolvedValue({
      id: 'survey-1',
      titulo: 'Encuesta 2026',
      fecha_inicio: new Date('2026-01-01'),
      fecha_fin: new Date('2026-12-31'),
      estado: 'BORRADOR',
      formato: 'WEB',
      fecha_creacion: new Date('2026-01-01'),
      id_carrera: 'career-1',
    });
    const repository = new PrismaSurveyRepository({
      administradorDeCarrera: { findMany: jest.fn().mockResolvedValue([assignment]) },
      encuesta: { create },
    } as never);

    const result = await repository.createManaged('user-1', ['career-1'], {
      title: 'Encuesta 2026',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id_administrador: 'assignment-1',
          id_carrera: 'career-1',
          estado: 'BORRADOR',
        }),
      }),
    );
    expect(result.status).toBe('BORRADOR');
  });

  it('rechaza fechas invertidas', async () => {
    const repository = new PrismaSurveyRepository({
      administradorDeCarrera: { findMany: jest.fn().mockResolvedValue([assignment]) },
    } as never);

    await expect(
      repository.createManaged('user-1', ['career-1'], {
        title: 'Encuesta inválida',
        startDate: new Date('2026-12-31'),
        endDate: new Date('2026-01-01'),
      }),
    ).rejects.toThrow('La fecha de fin no puede ser anterior a la de inicio');
  });

  it('publica una encuesta cuando no hay otra vigente en la carrera', async () => {
    const findFirst = jest
      .fn()
      .mockResolvedValueOnce({
        id: 'survey-2',
        id_administrador: 'assignment-1',
        fecha_inicio: new Date('2026-01-01'),
        fecha_fin: new Date('2026-12-31'),
      })
      .mockResolvedValueOnce(null);
    const repository = new PrismaSurveyRepository({
      administradorDeCarrera: { findFirst: jest.fn().mockResolvedValue(assignment) },
      encuesta: {
        findFirst,
        update: jest.fn().mockResolvedValue({
          id: 'survey-2',
          titulo: 'Encuesta 2026',
          fecha_inicio: new Date('2026-01-01'),
          fecha_fin: new Date('2026-12-31'),
          estado: 'PUBLICADA',
          formato: 'WEB',
          fecha_creacion: new Date('2026-01-01'),
          id_carrera: 'career-1',
        }),
      },
      $transaction: jest.fn(async (callback: (tx: unknown) => unknown) =>
        callback({
          encuesta: {
            findFirst: jest.fn().mockResolvedValue(null),
            update: jest.fn().mockResolvedValue({
              id: 'survey-2',
              titulo: 'Encuesta 2026',
              fecha_inicio: new Date('2026-01-01'),
              fecha_fin: new Date('2026-12-31'),
              estado: 'PUBLICADA',
              formato: 'WEB',
              fecha_creacion: new Date('2026-01-01'),
              id_carrera: 'career-1',
            }),
          },
        }),
      ),
    } as never);

    const result = await repository.publishManaged('user-1', ['career-1'], 'survey-2');

    expect(findFirst).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('PUBLICADA');
  });

  it('rechaza publicar si ya existe una encuesta vigente en la carrera', async () => {
    const repository = new PrismaSurveyRepository({
      administradorDeCarrera: { findFirst: jest.fn().mockResolvedValue(assignment) },
      encuesta: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({
            id: 'survey-2',
            fecha_inicio: new Date('2026-01-01'),
            fecha_fin: new Date('2026-12-31'),
          }),
      },
      $transaction: jest.fn(async (callback: (tx: unknown) => unknown) =>
        callback({
          encuesta: {
            findFirst: jest.fn().mockResolvedValue({ id: 'survey-1' }),
          },
        }),
      ),
    } as never);

    await expect(repository.publishManaged('user-1', ['career-1'], 'survey-2')).rejects.toThrow(
      'Ya existe una encuesta publicada y vigente para esta carrera',
    );
  });
  describe('administrador con dos carreras (bug 2 del QA de la HU-005)', () => {
    const sistemas = { id: 'assignment-sis', id_carrera: 'career-sis' };
    const informatica = { id: 'assignment-inf', id_carrera: 'career-inf' };
    const dates = { startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31') };
    const created = (careerId: string) => ({
      id: 'survey-9',
      titulo: 'Seguimiento laboral',
      fecha_inicio: dates.startDate,
      fecha_fin: dates.endDate,
      estado: 'BORRADOR',
      formato: 'WEB',
      fecha_creacion: new Date('2026-11-25'),
      id_carrera: careerId,
    });

    it('crea la encuesta en la carrera elegida', async () => {
      const findMany = jest.fn().mockResolvedValue([informatica]);
      const create = jest.fn().mockResolvedValue(created('career-inf'));
      const repository = new PrismaSurveyRepository({
        administradorDeCarrera: { findMany },
        encuesta: { create },
      } as never);

      const result = await repository.createManaged('user-1', ['career-sis', 'career-inf'], {
        title: 'Seguimiento laboral',
        ...dates,
        careerId: 'career-inf',
      });

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id_carrera: { in: ['career-inf'] } }),
        }),
      );
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ id_administrador: 'assignment-inf', id_carrera: 'career-inf' }),
        }),
      );
      expect(result.careerId).toBe('career-inf');
    });

    it('pide la carrera si no se indica y el administrador tiene varias', async () => {
      const create = jest.fn();
      const repository = new PrismaSurveyRepository({
        administradorDeCarrera: { findMany: jest.fn().mockResolvedValue([sistemas, informatica]) },
        encuesta: { create },
      } as never);

      await expect(
        repository.createManaged('user-1', ['career-sis', 'career-inf'], { title: 'Encuesta', ...dates }),
      ).rejects.toMatchObject({ code: 'SURVEY_CAREER_REQUIRED' });
      expect(create).not.toHaveBeenCalled();
    });

    it('rechaza una carrera que el administrador no tiene', async () => {
      const findMany = jest.fn();
      const repository = new PrismaSurveyRepository({
        administradorDeCarrera: { findMany },
      } as never);

      await expect(
        repository.createManaged('user-1', ['career-sis'], {
          title: 'Encuesta',
          ...dates,
          careerId: 'career-inf',
        }),
      ).rejects.toMatchObject({ code: 'SURVEY_CAREER_FORBIDDEN', message: 'No administras esa carrera' });
      expect(findMany).not.toHaveBeenCalled();
    });
  });
});
