/// <reference types="jest" />
import { PrismaJobPostingRepository } from './prisma-job-posting.repository';

describe('PrismaJobPostingRepository read operations', () => {
  it('consulta solo estados publicados y ordena por fecha de publicación reciente', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: 'vacancy-1',
        titulo: 'Desarrollador',
        estado: 'PUBLICADO',
        fecha_cierre: null,
        fecha_publicacion: new Date('2026-11-16T10:00:00.000Z'),
        descripcion_tecnica: 'Descripción breve',
        modalidad: 'REMOTO',
        requisito_tecnico_registros: [
          {
            id: 'requirement-1',
            nombre: 'Python',
            nombre_normalizado: 'python',
          },
        ],
        empresa: {
          razon_social: 'Empresa',
          sector_empresa_registros: [{ nombre: 'Tecnología' }],
          direccion_empresa_registros: [{ departamento: 'Cochabamba' }],
        },
      },
    ]);
    const prisma = {
      vacante: {
        create: jest.fn(),
        findMany,
        findUnique: jest.fn(),
      },
    };
    const repository = new PrismaJobPostingRepository(prisma as never);

    await expect(repository.listPublished()).resolves.toMatchObject([
      {
        id: 'vacancy-1',
        title: 'Desarrollador',
        companyName: 'Empresa',
        areaName: 'Tecnología',
        locationName: 'Cochabamba',
        status: 'PUBLICADO',
        requirements: [
          {
            id: 'requirement-1',
            name: 'Python',
            normalizedName: 'python',
          },
        ],
      },
    ]);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { estado: { in: ['PUBLICADO', 'PUBLICADA'] } },
        orderBy: [
          { fecha_publicacion: { sort: 'desc', nulls: 'last' } },
          { created_at: { sort: 'desc', nulls: 'last' } },
        ],
      }),
    );
  });

  it('lee el detalle y solo la relación de requisitos de ese registro', async () => {
    const findUnique = jest.fn().mockResolvedValue({
      id: 'vacancy-1',
      titulo: 'Desarrollador',
      estado: 'PUBLICADO',
      fecha_cierre: null,
      fecha_publicacion: new Date('2026-11-16T10:00:00.000Z'),
      empresa: {
        razon_social: 'Empresa',
        sector_empresa_registros: [{ nombre: 'Tecnología' }],
        direccion_empresa_registros: [{ departamento: 'Cochabamba' }],
      },
      descripcion_tecnica: 'Descripción',
      modalidad: 'REMOTO',
      nivel_experiencia: 'JUNIOR',
      requisito_tecnico_registros: [
        {
          id: 'requirement-1',
          nombre: 'Python',
          nombre_normalizado: 'python',
        },
      ],
    });
    const prisma = {
      vacante: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique,
      },
    };
    const repository = new PrismaJobPostingRepository(prisma as never);

    await expect(repository.findById('vacancy-1')).resolves.toMatchObject({
      id: 'vacancy-1',
      areaName: 'Tecnología',
      locationName: 'Cochabamba',
      requirements: [{ id: 'requirement-1', name: 'Python' }],
    });
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'vacancy-1' } }),
    );
  });
});
