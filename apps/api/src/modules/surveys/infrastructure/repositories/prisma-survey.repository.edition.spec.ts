import { PrismaSurveyRepository } from './prisma-survey.repository';

describe('T6.1 - Edicion unica de encuesta', () => {
  const input = {
    idEncuesta: 'encuesta-1',
    idTitulado: 'titulado-1',
    condicionLaboral: true,
    cargo: 'Desarrollador',
    empresa: 'Empresa de prueba',
    area: 'Tecnologia',
    modalidad: 'Presencial',
    salarioMensual: '3.000–5.000',
    tiempoInsercion: '3',
  };

  function setup(
    options: {
      used?: boolean;
      updatedCount?: number;
      active?: boolean;
      existing?: boolean;
    } = {},
  ) {
    const prisma = {
      titulado: {
        findUnique: jest.fn().mockResolvedValue({
          id_carrera: 'carrera-1',
        }),
      },
      encuesta: {
        findFirst: jest.fn().mockResolvedValue(
          options.active === false
            ? null
            : { id: 'encuesta-1' },
        ),
      },
      respuestaEncuesta: {
        findFirst: jest.fn().mockResolvedValue(
          options.existing === false
            ? null
            : {
                id: 'respuesta-1',
                edicionUsada: options.used ?? false,
              },
        ),
        updateMany: jest.fn().mockResolvedValue({
          count: options.updatedCount ?? 1,
        }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'respuesta-1',
          edicionUsada: true,
          fechaActualizacion: new Date(),
        }),
      },
    };

    const cache = {
      invalidateAccreditationDashboardCache: jest
        .fn()
        .mockResolvedValue(undefined),
    };

    const RepositoryClass = PrismaSurveyRepository as unknown as new (
      ...args: unknown[]
    ) => PrismaSurveyRepository;

    const repository = new RepositoryClass(prisma, cache);

    return { repository, prisma, cache };
  }

  it('permite la primera edicion', async () => {
    const { repository, prisma } = setup();

    const result = await repository.updateOnce(input);

    expect(result.edicionUsada).toBe(true);

    expect(
      prisma.respuestaEncuesta.updateMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          idTitulado: 'titulado-1',
          edicionUsada: false,
        }),
        data: expect.objectContaining({
          condicionLaboral: true,
          edicionUsada: true,
          fechaActualizacion: expect.any(Date),
        }),
      }),
    );
  });

  it('rechaza una segunda edicion', async () => {
    const { repository, prisma } = setup({
      used: true,
    });

    await expect(
      repository.updateOnce(input),
    ).rejects.toThrow(
      'Ya utilizaste tu única edición',
    );

    expect(
      prisma.respuestaEncuesta.updateMany,
    ).not.toHaveBeenCalled();
  });

  it('rechaza una edicion simultanea', async () => {
    const { repository } = setup({
      updatedCount: 0,
    });

    await expect(
      repository.updateOnce(input),
    ).rejects.toThrow(
      'La encuesta ya no permite ediciones',
    );
  });

  it('rechaza encuestas no vigentes', async () => {
    const { repository, prisma } = setup({
      active: false,
    });

    await expect(
      repository.updateOnce(input),
    ).rejects.toThrow(
      'No existe una encuesta vigente',
    );

    expect(
      prisma.respuestaEncuesta.updateMany,
    ).not.toHaveBeenCalled();
  });

  it('rechaza respuestas inexistentes', async () => {
    const { repository } = setup({
      existing: false,
    });

    await expect(
      repository.updateOnce(input),
    ).rejects.toThrow(
      'Primero debes enviar la encuesta',
    );
  });

  it('invalida la cache al editar correctamente', async () => {
    const { repository, cache } = setup();

    await repository.updateOnce(input);

    expect(
      cache.invalidateAccreditationDashboardCache,
    ).toHaveBeenCalledWith('carrera-1');
  });

  it('no invalida cache si la edicion falla', async () => {
    const { repository, cache } = setup({
      used: true,
    });

    await expect(
      repository.updateOnce(input),
    ).rejects.toThrow();

    expect(
      cache.invalidateAccreditationDashboardCache,
    ).not.toHaveBeenCalled();
  });
});
