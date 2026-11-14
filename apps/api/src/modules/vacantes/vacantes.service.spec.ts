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
      porcentaje_match: '92.50',
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
    const prisma = {
      vacante: { count: jest.fn().mockResolvedValue(opts.vacantesVisibles ?? 1) },
      postulacion: {
        findMany: jest.fn().mockResolvedValue(opts.filas ?? [fila()]),
        findFirst: jest.fn().mockResolvedValue(opts.detalle === undefined ? fila() : opts.detalle),
      },
    };
    return { servicio: new VacantesService(prisma as never), prisma };
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
        matchPercentage: 92.5,
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