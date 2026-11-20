import { Test } from '@nestjs/testing';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { PrismaJobPostingAffinityDataAdapter } from './prisma-job-posting-affinity-data.adapter';

describe('HU10: lectura agrupada de datos de afinidad', () => {
  const database = {
    titulado: { findMany: jest.fn() },
    vacante: { findMany: jest.fn() },
  };
  let adapter: PrismaJobPostingAffinityDataAdapter;

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        PrismaJobPostingAffinityDataAdapter,
        { provide: PrismaService, useValue: database },
      ],
    }).compile();
    adapter = module.get(PrismaJobPostingAffinityDataAdapter);
  });

  it('lee las cinco fuentes por usuario, conserva campos separados y distingue IDs', async () => {
    database.titulado.findMany.mockResolvedValue([
      {
        id: 'graduate-1',
        id_usuario: 'user-1',
        formacion_academica_registros: [{ titulo: 'machine', institucion: 'learning' }],
        experiencia_laboral_registros: [{ cargo: 'Desarrollador', empresa: null }],
        certificacion_registros: [{ nombre: ' AWS ', entidad_emisora: 'Amazon' }],
        proyecto_registros: [
          { nombre: 'API', descripcion: 'Backend', tecnologias: 'C++, Node.js' },
        ],
        perfil_area_registros: [{ descripcion_profesional: ' SQL ' }],
      },
    ]);
    await expect(adapter.readProfiles(['user-1', 'user-2', 'user-1'])).resolves.toEqual([
      {
        userId: 'user-1',
        tituladoId: 'graduate-1',
        texts: [
          'SQL',
          'machine',
          'learning',
          'Desarrollador',
          'AWS',
          'Amazon',
          'API',
          'Backend',
          'C++, Node.js',
        ],
        description: ' SQL ',
        hasEducation: true,
        hasExperience: true,
        hasCertification: true,
        hasProject: true,
      },
    ]);
    expect(database.titulado.findMany).toHaveBeenCalledTimes(1);
    expect(database.titulado.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_usuario: { in: ['user-1', 'user-2'] } },
        select: expect.objectContaining({
          perfil_area_registros: {
            orderBy: [{ fecha_creacion: 'asc' }, { id: 'asc' }],
            take: 1,
            select: { descripcion_profesional: true },
          },
        }),
      }),
    );
  });

  it('representa secciones ausentes y no fabrica perfiles para usuarios inexistentes', async () => {
    database.titulado.findMany.mockResolvedValue([
      {
        id: 'graduate-1',
        id_usuario: 'user-1',
        formacion_academica_registros: [],
        experiencia_laboral_registros: [],
        certificacion_registros: [],
        proyecto_registros: [],
        perfil_area_registros: [],
      },
    ]);
    await expect(adapter.readProfiles(['user-1', 'missing'])).resolves.toEqual([
      {
        userId: 'user-1',
        tituladoId: 'graduate-1',
        texts: [],
        description: null,
        hasEducation: false,
        hasExperience: false,
        hasCertification: false,
        hasProject: false,
      },
    ]);
  });

  it('lee solo requisitos estructurados y mantiene vacantes sin requisitos', async () => {
    database.vacante.findMany.mockResolvedValue([
      { id: 'v1', requisito_tecnico_registros: [{ nombre: 'SQL' }] },
      { id: 'v2', requisito_tecnico_registros: [] },
    ]);
    await expect(adapter.readRequirements(['v1', 'v2', 'v1'])).resolves.toEqual([
      { vacancyId: 'v1', requirements: ['SQL'] },
      { vacancyId: 'v2', requirements: [] },
    ]);
    expect(database.vacante.findMany).toHaveBeenCalledTimes(1);
    expect(database.vacante.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['v1', 'v2'] } },
      select: {
        id: true,
        requisito_tecnico_registros: {
          orderBy: [{ nombre_normalizado: 'asc' }, { id: 'asc' }],
          select: { nombre: true },
        },
      },
    });
  });

  it('no consulta la base para listas vacías y propaga fallos de lectura', async () => {
    await expect(adapter.readProfiles([])).resolves.toEqual([]);
    await expect(adapter.readRequirements([])).resolves.toEqual([]);
    expect(database.titulado.findMany).not.toHaveBeenCalled();
    expect(database.vacante.findMany).not.toHaveBeenCalled();
    const error = new Error('Lectura no disponible');
    database.vacante.findMany.mockRejectedValue(error);
    await expect(adapter.readRequirements(['v1'])).rejects.toBe(error);
  });
});
