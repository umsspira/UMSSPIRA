import { NotFoundException } from '@nestjs/common';
import { VacantesService } from './vacantes.service';

// HU-01: postulantes reales de una vacante de la empresa.
describe('VacantesService · postulantes (HU-01)', () => {
  const ID_VACANTE = '44500000-0000-4000-8000-000000000001';
  const ID_POSTULACION = '44800000-0000-4000-8000-000000000001';
  const ID_USUARIO = '20000000-0000-4000-8000-000000000003';

  function fila(overrides: Record<string, unknown> = {}) {
    return {
      id: ID_POSTULACION,
      estado: 'preseleccionado',
      porcentaje_match: 92,
      fecha_match: new Date('2026-11-01T12:00:00.000Z'),
      created_at: new Date('2026-11-02T00:00:00.000Z'),
      usuario: {
        nombre: 'Ana Rojas',
        correo: 'ana.rojas.demo@umsspira.local',
        titulado: { nombre: 'Ana', apellido: 'Rojas', curriculum_vitae: null },
      },
      ...overrides,
    };
  }

  function crearServicio(opts: { vacantesVisibles?: number; filas?: unknown[]; detalle?: unknown } = {}) {
    const rows = (opts.filas ?? [fila()]) as ReturnType<typeof fila>[];
    const statuses = new Map(rows.map((row) => [row.id, row.porcentaje_match === null ? 'pending' : 'ready']));
    const refresh = {
      forVacancy: jest.fn().mockResolvedValue(statuses),
      forApplication: jest.fn().mockResolvedValue(statuses),
    };
    const prisma = {
      vacante: {
        count: jest.fn().mockResolvedValue(opts.vacantesVisibles ?? 1),
        findFirst: jest.fn().mockResolvedValue(opts.detalle ?? null),
      },
      postulacion: {
        findMany: jest.fn().mockResolvedValue(rows),
        findFirst: jest.fn().mockResolvedValue(opts.detalle === undefined ? fila() : opts.detalle),
      },
    };
    return { servicio: new VacantesService(prisma as never, {} as never, {} as never, refresh as never, {} as never), prisma, refresh };
  }

  it('devuelve los postulantes con la forma que espera el front', async () => {
    const { servicio } = crearServicio();

    await expect(servicio.listarPostulantes(ID_VACANTE, ID_USUARIO)).resolves.toEqual([
      {
        id: ID_POSTULACION,
        name: 'Ana Rojas',
        email: 'ana.rojas.demo@umsspira.local',
        location: null,
        experienceLevel: null,
        stage: 'preseleccionado',
        appliedAt: '2026-11-02T00:00:00.000Z',
        hasCv: false,
        cvUrl: null,
        matchPercentage: 92,
        matchCalculatedAt: '2026-11-01T12:00:00.000Z',
        matchStatus: 'ready',
        skills: null,
      },
    ]);
  });

  it('ordena por afinidad descendente dejando sin porcentaje al final', async () => {
    const { servicio, prisma } = crearServicio();

    await servicio.listarPostulantes(ID_VACANTE, ID_USUARIO);

    expect(prisma.postulacion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_vacante: ID_VACANTE },
        orderBy: [{ porcentaje_match: { sort: 'desc', nulls: 'last' } }, { created_at: 'asc' }],
      }),
    );
  });

  it('acepta al dueño y a los usuarios activos de la empresa (HU-02)', async () => {
    const { servicio, prisma } = crearServicio();

    await servicio.listarPostulantes(ID_VACANTE, ID_USUARIO);

    expect(prisma.vacante.count).toHaveBeenCalledWith({
      where: {
        id: ID_VACANTE,
        empresa: {
          OR: [
            { id_usuario: ID_USUARIO },
            { empresa_usuario_registros: { some: { id_usuario: ID_USUARIO, estado: 'activo' } } },
          ],
        },
      },
    });
  });

  it('responde 404 si la vacante no existe o es de otra empresa, sin leer postulaciones', async () => {
    const { servicio, prisma } = crearServicio({ vacantesVisibles: 0 });

    await expect(servicio.listarPostulantes(ID_VACANTE, ID_USUARIO)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.postulacion.findMany).not.toHaveBeenCalled();
  });

  it('no inventa el porcentaje cuando el motor no lo devolvió (CA-10)', async () => {
    const { servicio } = crearServicio({ filas: [fila({ porcentaje_match: null })] });

    const postulantes = await servicio.listarPostulantes(ID_VACANTE, ID_USUARIO);

    expect(postulantes[0]?.matchPercentage).toBeNull();
  });

  it('usa el nombre del usuario si el titulado no tiene nombre, e indica si hay CV', async () => {
    const { servicio } = crearServicio({
      filas: [
        fila({
          usuario: {
            nombre: 'Usuario sin perfil',
            correo: 'x@umsspira.local',
            titulado: { nombre: null, apellido: null, curriculum_vitae: { id: 'cv-1' } },
          },
        }),
      ],
    });

    const postulantes = await servicio.listarPostulantes(ID_VACANTE, ID_USUARIO);

    expect(postulantes[0]?.name).toBe('Usuario sin perfil');
    expect(postulantes[0]?.hasCv).toBe(true);
  });

  it('devuelve el detalle de un postulante de la vacante', async () => {
    const { servicio, prisma } = crearServicio();

    const detalle = await servicio.obtenerPostulante(ID_VACANTE, ID_POSTULACION, ID_USUARIO);

    expect(detalle.id).toBe(ID_POSTULACION);
    expect(prisma.postulacion.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: ID_POSTULACION, id_vacante: ID_VACANTE } }),
    );
  });

  it('responde 404 si el postulante no pertenece a la vacante', async () => {
    const { servicio } = crearServicio({ detalle: null });

    await expect(
      servicio.obtenerPostulante(ID_VACANTE, ID_POSTULACION, ID_USUARIO),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('VacantesService · mis postulaciones (HU-006)', () => {
  const ID_USUARIO = '20000000-0000-4000-8000-000000000003';
  const ID_POSTULACION = '44800000-0000-4000-8000-000000000001';
  const ID_VACANTE = '44500000-0000-4000-8000-000000000001';

  function crearServicio(filas: unknown[] = []) {
    const statuses = new Map((filas as { id: string; porcentaje_match: number | null }[])
      .map((row) => [row.id, row.porcentaje_match === null ? 'pending' : 'ready']));
    const refresh = { forUser: jest.fn().mockResolvedValue(statuses) };
    const prisma = {
      postulacion: { findMany: jest.fn().mockResolvedValue(filas) },
      vacante: { findFirst: jest.fn() },
    };
    return { servicio: new VacantesService(prisma as never, {} as never, {} as never, refresh as never, {} as never), prisma };
  }

  it('filtra por usuario, ordena de más reciente a más antigua y no inventa la afinidad', async () => {
    const appliedAt = new Date('2026-11-02T00:00:00.000Z');
    const { servicio, prisma } = crearServicio([
      {
        id: ID_POSTULACION,
        created_at: appliedAt,
        porcentaje_match: null,
        fecha_match: null,
        vacante: {
          id: ID_VACANTE,
          titulo: 'Desarrollador',
          estado: 'CERRADA',
          empresa: { razon_social: 'Empresa Demo' },
        },
      },
    ]);

    await expect(servicio.listarMisPostulaciones(ID_USUARIO)).resolves.toEqual([
      {
        id: ID_POSTULACION,
        vacancyId: ID_VACANTE,
        vacancyTitle: 'Desarrollador',
        companyName: 'Empresa Demo',
        appliedAt: appliedAt.toISOString(),
        matchPercentage: null,
        matchCalculatedAt: null,
        matchStatus: 'pending',
        isVacancyAvailable: false,
      },
    ]);
    expect(prisma.postulacion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_usuario: ID_USUARIO },
        orderBy: [{ created_at: { sort: 'desc', nulls: 'last' } }, { id: 'asc' }],
      }),
    );
  });

  it('convierte una afinidad fuera de rango en Sin calcular', async () => {
    const { servicio } = crearServicio([
      {
        id: ID_POSTULACION,
        created_at: null,
        porcentaje_match: 130,
        vacante: null,
      },
    ]);

    const [postulacion] = await servicio.listarMisPostulaciones(ID_USUARIO);

    expect(postulacion?.matchPercentage).toBeNull();
    expect(postulacion?.isVacancyAvailable).toBe(false);
  });

  it('reconoce los estados activos usados por las vacantes', async () => {
    const { servicio } = crearServicio([
      {
        id: ID_POSTULACION,
        created_at: null,
        porcentaje_match: 0,
        vacante: { id: ID_VACANTE, titulo: 'Analista', estado: 'publicada', empresa: null },
      },
    ]);

    const [postulacion] = await servicio.listarMisPostulaciones(ID_USUARIO);

    expect(postulacion?.isVacancyAvailable).toBe(true);
    expect(postulacion?.matchPercentage).toBe(0);
  });

  it('permite abrir vacantes cerradas solo cuando el titulado se postuló', async () => {
    const vacante = {
      id: ID_VACANTE,
      titulo: 'Desarrollador',
      descripcion_tecnica: 'Experiencia en TypeScript',
      modalidad: 'REMOTO',
      nivel_experiencia: 'JUNIOR',
      estado: 'CERRADA',
      created_at: new Date('2026-11-01T00:00:00.000Z'),
      empresa: { razon_social: 'Empresa Demo' },
    };
    const { servicio, prisma } = crearServicio();
    prisma.vacante.findFirst.mockResolvedValue(vacante);

    await expect(servicio.obtenerOfertaParaTitulado(ID_VACANTE, ID_USUARIO)).resolves.toMatchObject({
      id: ID_VACANTE,
      isAvailable: false,
    });
    expect(prisma.vacante.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: ID_VACANTE,
          OR: [
            { estado: { in: ['PUBLICADO', 'PUBLICADA', 'ACTIVA', 'ACTIVO', 'ACTIVE', 'PUBLISHED'] } },
            { postulacion_registros: { some: { id_usuario: ID_USUARIO } } },
          ],
        },
      }),
    );
  });

  it('no expone una vacante cerrada a quien no se postuló', async () => {
    const { servicio } = crearServicio();

    await expect(servicio.obtenerOfertaParaTitulado(ID_VACANTE, ID_USUARIO)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

// HU-13: edición validada con scoping por empresa y bloqueo anti-doble-envío.
describe('VacantesService · edición de vacante (HU-13)', () => {
  const ID_VACANTE = '44500000-0000-4000-8000-000000000001';
  const ID_USUARIO = '20000000-0000-4000-8000-000000000003';

  function crearServicio(opts: { vacantesVisibles?: number } = {}) {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      vacante: {
        update: jest.fn().mockResolvedValue({ id: ID_VACANTE, titulo: 'Nueva' }),
      },
    };
    const prisma = {
      vacante: {
        count: jest.fn().mockResolvedValue(opts.vacantesVisibles ?? 1),
      },
      $transaction: jest.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
    };
    return { servicio: new VacantesService(prisma as never, {} as never, {} as never, {} as never, {} as never), prisma, tx };
  }

  it('permite editar al dueño y a los miembros activos de la empresa', async () => {
    const { servicio, prisma } = crearServicio();

    await servicio.actualizarVacante(ID_VACANTE, ID_USUARIO, { titulo: 'Nueva' });

    expect(prisma.vacante.count).toHaveBeenCalledWith({
      where: {
        id: ID_VACANTE,
        empresa: {
          OR: [
            { id_usuario: ID_USUARIO },
            { empresa_usuario_registros: { some: { id_usuario: ID_USUARIO, estado: 'activo' } } },
          ],
        },
      },
    });
  });

  it('responde 404 si la vacante no existe o es de otra empresa, sin actualizar nada', async () => {
    const { servicio, tx } = crearServicio({ vacantesVisibles: 0 });

    await expect(
      servicio.actualizarVacante(ID_VACANTE, ID_USUARIO, { titulo: 'Nueva' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.vacante.update).not.toHaveBeenCalled();
  });

  it('actualiza solo los campos enviados', async () => {
    const { servicio, tx } = crearServicio();

    await servicio.actualizarVacante(ID_VACANTE, ID_USUARIO, { estado: 'PAUSADA' });

    expect(tx.vacante.update).toHaveBeenCalledWith({
      where: { id: ID_VACANTE },
      data: { estado: 'PAUSADA' },
    });
  });

  it('serializa los envíos simultáneos con el bloqueo por vacante dentro de la transacción', async () => {
    const { servicio, prisma, tx } = crearServicio();

    await servicio.actualizarVacante(ID_VACANTE, ID_USUARIO, { titulo: 'Nueva' });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    const orden = tx.$queryRaw.mock.invocationCallOrder[0];
    const actualizacion = tx.vacante.update.mock.invocationCallOrder[0];
    expect(orden).toBeLessThan(actualizacion);
  });
});
