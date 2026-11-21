import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
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
        titulado: {
          nombre: 'Ana',
          apellido: 'Rojas',
          curriculum_vitae: null,
          experiencia_laboral_registros: [],
          formacion_academica_registros: [],
          certificacion_registros: [],
        },
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
        workExperience: [],
        education: [],
        certifications: [],
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
            titulado: {
              ...fila().usuario.titulado,
              nombre: null,
              apellido: null,
              curriculum_vitae: { id: 'cv-1' },
            },
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

  it('responde 404 al descargar el CV desde una vacante de otra empresa (CA-12)', async () => {
    const { servicio, prisma } = crearServicio({ vacantesVisibles: 0 });

    await expect(
      servicio.descargarCvPostulante(ID_VACANTE, ID_POSTULACION, ID_USUARIO),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.postulacion.findFirst).not.toHaveBeenCalled();
  });

  it('responde 404 al descargar si el postulante no tiene CV', async () => {
    const { servicio } = crearServicio({
      detalle: fila({
        usuario: {
          nombre: 'Ana Rojas',
          correo: 'ana.rojas.demo@umsspira.local',
          titulado: { nombre: 'Ana', apellido: 'Rojas', curriculum_vitae: null },
        },
      }),
    });

    await expect(
      servicio.descargarCvPostulante(ID_VACANTE, ID_POSTULACION, ID_USUARIO),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  describe('política de datos del postulante (HU-16, T16.1)', () => {
    const CLAVES_POSTULANTE = [
      'id',
      'name',
      'email',
      'location',
      'experienceLevel',
      'stage',
      'appliedAt',
      'hasCv',
      'cvUrl',
      'matchPercentage',
      'matchCalculatedAt',
      'matchStatus',
      'skills',
      'workExperience',
      'education',
      'certifications',
    ];

    function filaConHistorial() {
      const datosInternos = {
        id: 'registro-interno',
        id_titulado: 'titulado-interno',
        fecha_creacion: new Date('2026-11-01T00:00:00.000Z'),
        campoFuturoNoAutorizado: 'privado',
      };
      return fila({
        ...datosInternos,
        id: ID_POSTULACION,
        id_usuario: 'usuario-interno',
        id_vacante: ID_VACANTE,
        usuario: {
          ...fila().usuario,
          ...datosInternos,
          telefono: '70000000',
          fecha_nacimiento: '1995-01-01',
          direccion: 'Dirección privada',
          cuenta_acceso: { password_hash: 'hash-privado' },
          sesiones_acceso: [{ token: 'token-privado' }],
          postulacion_registros: [{ id: 'otra-postulacion' }],
          titulado: {
            ...fila().usuario.titulado,
            ...datosInternos,
            ci: '1234567',
            extension_ci: 'CB',
            cod_sis: 'codigo-privado',
            respuesta_encuesta_registros: [{ respuesta: 'respuesta-privada' }],
            curriculum_vitae: { id: 'cv-interno', ruta: 'ruta-privada' },
            experiencia_laboral_registros: [
              {
                ...datosInternos,
                cargo: 'Desarrolladora',
                empresa: 'Empresa actual',
                fecha_inicio: new Date('2025-03-15T00:00:00.000Z'),
                fecha_fin: null,
              },
              {
                ...datosInternos,
                cargo: 'Practicante',
                empresa: 'Empresa anterior',
                fecha_inicio: new Date('2023-02-01T00:00:00.000Z'),
                fecha_fin: new Date('2024-12-31T00:00:00.000Z'),
              },
            ],
            formacion_academica_registros: [
              {
                ...datosInternos,
                titulo: 'Ingeniería de Sistemas',
                institucion: 'UMSS',
                anio_egreso: 2024,
                grado: 'Licenciatura',
                respaldo_registros: [{ archivo_key: 'respaldo-privado' }],
              },
              {
                ...datosInternos,
                titulo: 'Formación técnica',
                institucion: 'Instituto',
                anio_egreso: 2020,
                grado: null,
              },
            ],
            certificacion_registros: [
              {
                ...datosInternos,
                nombre: 'TypeScript',
                entidad_emisora: 'Entidad certificadora',
                grado: 'Avanzado',
                anio_emision: 2025,
                estado_validacion: 'validado',
                certificacion_respaldo_registros: [{ archivo_key: 'archivo-privado' }],
                validacion_registros: [{ justificacion: 'justificacion-privada' }],
              },
              {
                ...datosInternos,
                nombre: 'Bases de datos',
                entidad_emisora: 'Otra entidad',
                grado: 'Intermedio',
                anio_emision: null,
              },
            ],
          },
        },
      });
    }

    async function consultarPostulante(modo: 'listado' | 'detalle', servicio: VacantesService) {
      if (modo === 'listado') {
        const [postulante] = await servicio.listarPostulantes(ID_VACANTE, ID_USUARIO);
        return postulante;
      }
      return servicio.obtenerPostulante(ID_VACANTE, ID_POSTULACION, ID_USUARIO);
    }

    it.each(['listado', 'detalle'] as const)(
      '%s: publica únicamente las claves autorizadas, incluso si Prisma entrega datos adicionales',
      async (modo) => {
        const registro = filaConHistorial();
        const { servicio } = crearServicio({ filas: [registro], detalle: registro });

        const postulante = await consultarPostulante(modo, servicio);

        expect(Object.keys(postulante).sort()).toEqual([...CLAVES_POSTULANTE].sort());
        expect(postulante.workExperience).toHaveLength(2);
        expect(postulante.education).toHaveLength(2);
        expect(postulante.certifications).toHaveLength(2);
        for (const experiencia of postulante.workExperience) {
          expect(Object.keys(experiencia).sort()).toEqual(
            ['position', 'company', 'startDate', 'endDate'].sort(),
          );
        }
        for (const formacion of postulante.education) {
          expect(Object.keys(formacion).sort()).toEqual(
            ['title', 'institution', 'graduationYear', 'level'].sort(),
          );
        }
        for (const certificacion of postulante.certifications) {
          expect(Object.keys(certificacion).sort()).toEqual(
            ['name', 'issuer', 'level', 'year'].sort(),
          );
        }
        expect(postulante).toEqual({
          id: ID_POSTULACION,
          name: 'Ana Rojas',
          email: 'ana.rojas.demo@umsspira.local',
          location: null,
          experienceLevel: null,
          stage: 'preseleccionado',
          appliedAt: '2026-11-02T00:00:00.000Z',
          hasCv: true,
          cvUrl: null,
          matchPercentage: 92,
          matchCalculatedAt: '2026-11-01T12:00:00.000Z',
          matchStatus: 'ready',
          skills: null,
          workExperience: [
            {
              position: 'Desarrolladora',
              company: 'Empresa actual',
              startDate: '2025-03-15',
              endDate: null,
            },
            {
              position: 'Practicante',
              company: 'Empresa anterior',
              startDate: '2023-02-01',
              endDate: '2024-12-31',
            },
          ],
          education: [
            {
              title: 'Ingeniería de Sistemas',
              institution: 'UMSS',
              graduationYear: 2024,
              level: 'Licenciatura',
            },
            {
              title: 'Formación técnica',
              institution: 'Instituto',
              graduationYear: 2020,
              level: null,
            },
          ],
          certifications: [
            { name: 'TypeScript', issuer: 'Entidad certificadora', level: 'Avanzado', year: 2025 },
            { name: 'Bases de datos', issuer: 'Otra entidad', level: 'Intermedio', year: null },
          ],
        });
      },
    );

    it('listado y detalle comparten exactamente la selección mínima, el orden estable y la transformación', async () => {
      const registro = filaConHistorial();
      const { servicio, prisma } = crearServicio({ filas: [registro], detalle: registro });

      const listado = await servicio.listarPostulantes(ID_VACANTE, ID_USUARIO);
      const detalle = await servicio.obtenerPostulante(ID_VACANTE, ID_POSTULACION, ID_USUARIO);
      const seleccionListado = prisma.postulacion.findMany.mock.calls[0][0].select;
      const seleccionDetalle = prisma.postulacion.findFirst.mock.calls[0][0].select;

      expect(listado).toEqual([detalle]);
      expect(seleccionListado).toBe(seleccionDetalle);
      expect(seleccionListado).toEqual({
        id: true,
        estado: true,
        porcentaje_match: true,
        fecha_match: true,
        created_at: true,
        usuario: {
          select: {
            nombre: true,
            correo: true,
            titulado: {
              select: {
                nombre: true,
                apellido: true,
                curriculum_vitae: {
                  where: { contenido: { not: null } },
                  select: { id: true },
                },
                experiencia_laboral_registros: {
                  select: { cargo: true, empresa: true, fecha_inicio: true, fecha_fin: true },
                  orderBy: [{ fecha_inicio: 'desc' }, { id: 'asc' }],
                },
                formacion_academica_registros: {
                  select: { titulo: true, institucion: true, anio_egreso: true, grado: true },
                  orderBy: [{ anio_egreso: 'desc' }, { id: 'asc' }],
                },
                certificacion_registros: {
                  select: { nombre: true, entidad_emisora: true, grado: true, anio_emision: true },
                  orderBy: [{ anio_emision: { sort: 'desc', nulls: 'last' } }, { id: 'asc' }],
                },
              },
            },
          },
        },
      });
    });

    it.each(['listado', 'detalle'] as const)(
      '%s: conserva el alcance del dueño y de los invitados activos',
      async (modo) => {
        const { servicio, prisma } = crearServicio();

        await consultarPostulante(modo, servicio);

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
      },
    );

    it.each(['listado', 'detalle'] as const)(
      '%s: deniega acceso sin consultar postulaciones',
      async (modo) => {
        const { servicio, prisma } = crearServicio({ vacantesVisibles: 0 });

        await expect(consultarPostulante(modo, servicio)).rejects.toBeInstanceOf(NotFoundException);
        expect(prisma.postulacion.findMany).not.toHaveBeenCalled();
        expect(prisma.postulacion.findFirst).not.toHaveBeenCalled();
      },
    );

    it.each(['listado', 'detalle'] as const)(
      '%s: devuelve arreglos vacíos cuando no hay registros profesionales',
      async (modo) => {
        const { servicio } = crearServicio();

        const postulante = await consultarPostulante(modo, servicio);

        expect(Object.keys(postulante).sort()).toEqual([...CLAVES_POSTULANTE].sort());
        expect(postulante.workExperience).toEqual([]);
        expect(postulante.education).toEqual([]);
        expect(postulante.certifications).toEqual([]);
      },
    );

    describe.each(['listado', 'detalle'] as const)('%s: relaciones opcionales', (modo) => {
      it.each([
        ['sin usuario', null],
        ['sin titulado', { nombre: null, correo: null, titulado: null }],
      ])('%s conserva el contrato y los valores por defecto', async (_caso, usuario) => {
        const registro = fila({ usuario, estado: null, created_at: null, porcentaje_match: null });
        const { servicio } = crearServicio({ filas: [registro], detalle: registro });

        const postulante = await consultarPostulante(modo, servicio);

        expect(postulante).toEqual({
          id: ID_POSTULACION,
          name: 'Sin nombre',
          email: '',
          location: null,
          experienceLevel: null,
          stage: 'postulado',
          appliedAt: null,
          hasCv: false,
          cvUrl: null,
          matchPercentage: null,
          matchCalculatedAt: null,
          matchStatus: 'pending',
          skills: null,
          workExperience: [],
          education: [],
          certifications: [],
        });
      });
    });

    it('conserva la respuesta de listado vacío cuando no hay postulantes', async () => {
      const { servicio } = crearServicio({ filas: [] });

      await expect(servicio.listarPostulantes(ID_VACANTE, ID_USUARIO)).resolves.toEqual([]);
    });
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
// HU-04: pruebas del cambio de etapa del postulante.
describe('VacantesService · cambio de etapa (HU-04)', () => {
  const ID_VACANTE = '44500000-0000-4000-8000-000000000001';
  const ID_POSTULACION = '44800000-0000-4000-8000-000000000001';
  const ID_USUARIO = '20000000-0000-4000-8000-000000000003';
  const ID_EMPRESA = '30000000-0000-4000-8000-000000000001';

  function crearServicio(opciones: {
    postulacion?: unknown;
    empresaAccesible?: number;
  } = {}) {
    const prisma = {
      postulacion: {
        findFirst: jest.fn().mockResolvedValue(
          opciones.postulacion === undefined
            ? { id: ID_POSTULACION, vacante: { id_empresa: ID_EMPRESA } }
            : opciones.postulacion
        ),
        update: jest.fn().mockResolvedValue({
          id: ID_POSTULACION,
          estado: 'entrevista',
        }),
      },
      empresa: {
        count: jest.fn().mockResolvedValue(
          opciones.empresaAccesible ?? 1
        ),
      },
    };

    return {
      servicio: new VacantesService(prisma as never, {} as never, {} as never, {} as never, {} as never),
      prisma,
    };
  }

  it('actualiza correctamente la etapa de una postulación', async () => {
    const { servicio, prisma } = crearServicio();

    await expect(
      servicio.cambiarEtapaPostulante(
        ID_VACANTE,
        ID_POSTULACION,
        ID_USUARIO,
        'entrevista'
      )
    ).resolves.toEqual({
      id: ID_POSTULACION,
      estado: 'entrevista',
    });

    expect(prisma.postulacion.update).toHaveBeenCalledWith({
      where: { id: ID_POSTULACION },
      data: { estado: 'entrevista' },
      select: { id: true, estado: true },
    });
  });

  it('rechaza una etapa inválida', async () => {
    const { servicio, prisma } = crearServicio();

    await expect(
      servicio.cambiarEtapaPostulante(
        ID_VACANTE,
        ID_POSTULACION,
        ID_USUARIO,
        'etapa_inventada'
      )
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.postulacion.update).not.toHaveBeenCalled();
  });

  it('rechaza una postulación inexistente', async () => {
    const { servicio, prisma } = crearServicio({
      postulacion: null,
    });

    await expect(
      servicio.cambiarEtapaPostulante(
        ID_VACANTE,
        ID_POSTULACION,
        ID_USUARIO,
        'entrevista'
      )
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.postulacion.update).not.toHaveBeenCalled();
  });

  it('impide cambiar la etapa a usuarios sin acceso a la empresa', async () => {
    const { servicio, prisma } = crearServicio({
      empresaAccesible: 0,
    });

    await expect(
      servicio.cambiarEtapaPostulante(
        ID_VACANTE,
        ID_POSTULACION,
        ID_USUARIO,
        'entrevista'
      )
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.postulacion.update).not.toHaveBeenCalled();
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