import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../shared/infrastructure/database/prisma.service';
import { VacancySearchIndexerService } from './vacancy-search-indexer.service';
import { VacantesService } from './vacantes.service';

describe('VacantesService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('persiste la edición y sincroniza los requisitos con el ID original', async () => {
    const updatedVacancy = {
      id: '30000000-0000-4000-8000-000000000001',
      id_empresa: '10000000-0000-4000-8000-000000000003',
      titulo: 'Desarrollador web actualizado',
      salario: null,
      modalidad: 'REMOTO',
      estado: 'PUBLICADO',
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      nivel_experiencia: 'Junior',
      descripcion_tecnica: 'Desarrollo con TypeScript',
      fecha_publicacion: null,
      fecha_cierre: null,
      fecha_actualizacion: new Date('2026-01-02T00:00:00.000Z'),
      vacante_requerimiento_laboral_registros: [
        {
          requerimiento_laboral: {
            descripcion: 'Conocimientos de bases de datos',
            ubicacion: 'Cochabamba',
            requerimiento_habilidad_registros: [
              {
                nivel_requerimiento: 'Intermedio',
                area: { nombre: 'PostgreSQL' },
              },
            ],
          },
        },
      ],
    };
    const prisma = {
      empresa: { findFirst: jest.fn().mockResolvedValue({ id: updatedVacancy.id_empresa }) },
      vacante: {
        findFirst: jest.fn().mockResolvedValue({ id: updatedVacancy.id }),
        update: jest.fn().mockResolvedValue(updatedVacancy),
      },
    };
    const indexer = {
      assertConfigured: jest.fn(),
      upsert: jest.fn().mockResolvedValue(undefined),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        VacantesService,
        { provide: PrismaService, useValue: prisma },
        { provide: VacancySearchIndexerService, useValue: indexer },
      ],
    }).compile();

    const service = moduleRef.get(VacantesService);
    const result = await service.actualizarVacante(
      updatedVacancy.id,
      'usuario-empresa',
      { titulo: updatedVacancy.titulo },
    );

    expect(prisma.vacante.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: updatedVacancy.id } }),
    );
    expect(indexer.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: updatedVacancy.id,
        titulo: updatedVacancy.titulo,
        fecha_actualizacion: updatedVacancy.fecha_actualizacion,
        requisitos_tecnicos: [
          { nombre: 'Conocimientos de bases de datos', nivel: null },
          { nombre: 'PostgreSQL', nivel: 'Intermedio' },
        ],
        ubicaciones: ['Cochabamba'],
      }),
    );
    expect(result).not.toHaveProperty('vacante_requerimiento_laboral_registros');
    expect(result.id).toBe(updatedVacancy.id);

    await moduleRef.close();
  });

  it('devuelve éxito si la persistencia terminó y Elasticsearch no está disponible', async () => {
    const updatedVacancy = {
      id: '30000000-0000-4000-8000-000000000001',
      id_empresa: '10000000-0000-4000-8000-000000000003',
      titulo: 'Desarrollador actualizado',
      salario: null,
      modalidad: 'REMOTO',
      estado: 'PUBLICADO',
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      nivel_experiencia: 'Junior',
      descripcion_tecnica: 'Desarrollo con TypeScript',
      fecha_publicacion: null,
      fecha_cierre: null,
      fecha_actualizacion: new Date('2026-01-02T00:00:00.000Z'),
      vacante_requerimiento_laboral_registros: [],
    };
    const prisma = {
      empresa: { findFirst: jest.fn().mockResolvedValue({ id: updatedVacancy.id_empresa }) },
      vacante: {
        findFirst: jest.fn().mockResolvedValue({ id: updatedVacancy.id }),
        update: jest.fn().mockResolvedValue(updatedVacancy),
      },
    };
    const indexer = {
      assertConfigured: jest.fn(() => {
        throw new Error('El índice no está configurado');
      }),
      upsert: jest.fn().mockRejectedValue(new Error('El índice no está disponible')),
    };
    const warning = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const moduleRef = await Test.createTestingModule({
      providers: [
        VacantesService,
        { provide: PrismaService, useValue: prisma },
        { provide: VacancySearchIndexerService, useValue: indexer },
      ],
    }).compile();

    const service = moduleRef.get(VacantesService);
    const result = await service.actualizarVacante(updatedVacancy.id, 'usuario-empresa', {
      titulo: updatedVacancy.titulo,
    });

    expect(result.id).toBe(updatedVacancy.id);
    expect(prisma.vacante.update).toHaveBeenCalled();
    expect(indexer.upsert).toHaveBeenCalled();
    expect(warning).toHaveBeenCalledWith(
      expect.stringContaining('se guardó, pero no pudo sincronizarse con Elasticsearch'),
    );

    await moduleRef.close();
  });
});
