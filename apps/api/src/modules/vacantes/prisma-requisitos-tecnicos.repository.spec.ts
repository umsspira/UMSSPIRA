import { BadRequestException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../shared/infrastructure/database/prisma.service';
import { PrismaRequisitosTecnicosRepository } from './prisma-requisitos-tecnicos.repository';

const VACANCY_ID = '11111111-1111-4111-8111-111111111111';
const REQUIREMENT_ID = '22222222-2222-4222-8222-222222222222';
const CREATED_AT = new Date('2026-01-15T10:00:00.000Z');

describe('PrismaRequisitosTecnicosRepository', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let repository: PrismaRequisitosTecnicosRepository;

  beforeEach(() => {
    prisma = createPrismaMock();
    repository = new PrismaRequisitosTecnicosRepository(
      prisma as unknown as PrismaService,
    );
  });

  it('persists requirements with a normalized key and maps the returned rows', async () => {
    prisma.requisitoTecnicoVacante.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({
          ...data,
          id_vacante: VACANCY_ID,
          fecha_creacion: CREATED_AT,
        }),
    );

    await expect(
      repository.crear([
        {
          id: REQUIREMENT_ID,
          idVacante: VACANCY_ID,
          competencia: '  Desarrollo   WEB ',
          nivel: 'Intermedio',
          tipo: 'Obligatorio',
          fechaCreacion: CREATED_AT.toISOString(),
        },
      ]),
    ).resolves.toEqual([
      {
        id: REQUIREMENT_ID,
        idVacante: VACANCY_ID,
        competencia: '  Desarrollo   WEB ',
        nivel: 'Intermedio',
        tipo: 'Obligatorio',
        fechaCreacion: CREATED_AT.toISOString(),
      },
    ]);

    expect(prisma.requisitoTecnicoVacante.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          competencia_clave: 'desarrollo web',
          descripcion: null,
        }),
      }),
    );
  });

  it('lists requirements scoped to the requested vacancy', async () => {
    prisma.requisitoTecnicoVacante.findMany.mockResolvedValue([databaseRow()]);

    await expect(
      repository.listarPorVacante(VACANCY_ID),
    ).resolves.toMatchObject([
      { id: REQUIREMENT_ID, idVacante: VACANCY_ID, competencia: 'SQL' },
    ]);
    expect(prisma.requisitoTecnicoVacante.findMany).toHaveBeenCalledWith({
      where: { id_vacante: VACANCY_ID },
      orderBy: [{ fecha_creacion: 'asc' }, { id: 'asc' }],
    });
  });

  it('updates and deletes only a requirement linked to the requested vacancy', async () => {
    prisma.requisitoTecnicoVacante.updateMany.mockResolvedValue({ count: 1 });
    prisma.requisitoTecnicoVacante.findUnique.mockResolvedValue({
      ...databaseRow(),
      nivel: 'Avanzado',
      descripcion: null,
    });
    prisma.requisitoTecnicoVacante.deleteMany.mockResolvedValue({ count: 1 });

    await expect(
      repository.actualizar(VACANCY_ID, REQUIREMENT_ID, {
        nivel: 'Avanzado',
        descripcion: '   ',
      }),
    ).resolves.toMatchObject({ nivel: 'Avanzado', descripcion: undefined });
    expect(prisma.requisitoTecnicoVacante.updateMany).toHaveBeenCalledWith({
      where: { id_vacante: VACANCY_ID, id: REQUIREMENT_ID },
      data: { nivel: 'Avanzado', descripcion: null },
    });

    await expect(repository.eliminar(VACANCY_ID, REQUIREMENT_ID)).resolves.toBe(
      true,
    );
    expect(prisma.requisitoTecnicoVacante.deleteMany).toHaveBeenCalledWith({
      where: { id_vacante: VACANCY_ID, id: REQUIREMENT_ID },
    });
  });

  it('maps Prisma uniqueness errors to a client validation error', async () => {
    prisma.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Duplicate key', {
        code: 'P2002',
        clientVersion: '7.10.1',
      }),
    );

    await expect(
      repository.crear([
        {
          id: REQUIREMENT_ID,
          idVacante: VACANCY_ID,
          competencia: 'SQL',
          nivel: 'Intermedio',
          tipo: 'Obligatorio',
          fechaCreacion: CREATED_AT.toISOString(),
        },
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

function databaseRow() {
  return {
    id: REQUIREMENT_ID,
    id_vacante: VACANCY_ID,
    competencia: 'SQL',
    nivel: 'Intermedio',
    tipo: 'Obligatorio',
    descripcion: null,
    fecha_creacion: CREATED_AT,
  };
}

function createPrismaMock() {
  return {
    requisitoTecnicoVacante: {
      create: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn((operations: Promise<unknown>[]) =>
      Promise.all(operations),
    ),
  };
}
