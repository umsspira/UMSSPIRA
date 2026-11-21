/// <reference types="jest" />
import { PrismaRadarRepository } from './prisma-radar.repository';
import type { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { calculateAffinity } from '../../domain/affinity-calculator';
import { RADAR_AREAS } from '../../domain/affinity-config';
import type { AffinityCalculation } from '../../domain/entities/affinity-calculation';
import { RADAR_AREA_IDS } from '../../domain/entities/radar-area';
import type { AreaScoreRecord } from '../../application/ports/radar-repository.port';

describe('PrismaRadarRepository', () => {

  it('aplica el mínimo de tres titulados distintos en el agregado SQL', async () => {
    const query = jest.fn().mockResolvedValue([
      { termino: 'tres', frecuencia_total: 6, cantidad_titulados: 3, ultima_deteccion: null },
    ]);
    const repository = new PrismaRadarRepository({ $queryRaw: query } as unknown as PrismaService);

    await expect(repository.getAggregatedUnmappedKeywords()).resolves.toEqual([
      { term: 'tres', totalFrequency: 6, graduatesCount: 3, lastDetectedAt: null },
    ]);
    expect(query.mock.calls[0][0].join('')).toMatch(/HAVING COUNT\(DISTINCT id_titulado\) >= 3/);
  });

  it('guarda el cálculo, los seis ejes y los términos no mapeados en una transacción', async () => {
    const transaction = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      calculoRadar: { create: jest.fn().mockResolvedValue({ id: 'calculation-id' }) },
      afinidadRadar: { createMany: jest.fn().mockResolvedValue({ count: 6 }) },
      palabraClaveNoMapeada: {
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        upsert: jest.fn().mockResolvedValue({}),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback: (tx: typeof transaction) => Promise<void>) =>
        callback(transaction),
      ),
    };
    const repository = new PrismaRadarRepository(prisma as unknown as PrismaService);
    const calculation: AffinityCalculation = {
      graduateId: 'graduate-id',
      inputHash: 'hash',
      calculatedAt: new Date('2026-10-22T12:00:00.000Z'),
      areas: calculateAffinity([], []),
      unmapped: [{ term: 'desconocido', count: 2 }],
    };

    await repository.saveCalculation({
      tituladoId: calculation.graduateId,
      hashEntrada: calculation.inputHash,
      estado: 'COMPLETADO',
      versionAlgoritmo: '1.0.0',
      areas: calculation.areas.map((a) => ({
        areaSlug: a.area as never,
        areaId: RADAR_AREA_IDS[a.area], // Corrección: Convertimos el texto al UUID usando el diccionario
        puntaje: a.score,
        porcentaje: a.percentage,
        ponderacion: a.weighting,
        palabrasClaveTop: a.topKeywords as never[],
      })),
      unmapped: calculation.unmapped,
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(transaction.calculoRadar.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ hash_entrada: 'hash' }) }),
    );
    expect(transaction.afinidadRadar.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining(
        RADAR_AREAS.map((area) =>
          expect.objectContaining({
            id_calculo_radar: 'calculation-id',
            id_area: RADAR_AREA_IDS[area],
          }),
        ),
      ),
    });
    expect(transaction.afinidadRadar.createMany.mock.calls[0][0].data).toHaveLength(6);
    expect(transaction.palabraClaveNoMapeada.upsert).not.toHaveBeenCalled();
    expect(transaction.$executeRaw).toHaveBeenCalledTimes(1);
    expect(transaction.$executeRaw.mock.calls[0]).toEqual([
      expect.any(Array),
      'graduate-id',
      expect.any(Date),
      JSON.stringify([{ termino: 'desconocido', frecuencia: 2 }]),
    ]);
    expect(transaction.palabraClaveNoMapeada.deleteMany).toHaveBeenCalledWith({
      where: {
        id_titulado: 'graduate-id',
        termino: { notIn: ['desconocido'] },
      },
    });
  });

  it('elimina todos los no mapeados antiguos cuando el perfil ya no tiene ninguno', async () => {
    const transaction = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      calculoRadar: { create: jest.fn().mockResolvedValue({ id: 'calculation-id' }) },
      afinidadRadar: { createMany: jest.fn().mockResolvedValue({ count: 6 }) },
      palabraClaveNoMapeada: {
        deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
        upsert: jest.fn(),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback: (tx: typeof transaction) => Promise<void>) =>
        callback(transaction),
      ),
    };
    const repository = new PrismaRadarRepository(prisma as unknown as PrismaService);

    await repository.saveCalculation({
      tituladoId: 'graduate-id',
      hashEntrada: 'new-profile-hash',
      estado: 'COMPLETADO',
      versionAlgoritmo: '1.0.0',
      areas: [],
      unmapped: [],
    });

    expect(transaction.palabraClaveNoMapeada.deleteMany).toHaveBeenCalledWith({
      where: { id_titulado: 'graduate-id' },
    });
    expect(transaction.palabraClaveNoMapeada.upsert).not.toHaveBeenCalled();
    expect(transaction.$executeRaw).not.toHaveBeenCalled();
  });

  it('convierte palabras_clave_top nulo en arreglo vacio al leer una fila antigua', async () => {
    const prisma = {
      calculoRadar: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'calculation-id',
          id_titulado: 'graduate-id',
          hash_entrada: 'hash',
          estado: 'COMPLETADO',
          version_algoritmo: '1.0.0',
          fecha_calculo: new Date('2026-10-22T12:00:00.000Z'),
        }),
      },
      afinidadRadar: {
        findMany: jest.fn().mockResolvedValue([
          {
            id_area: RADAR_AREA_IDS['software-development'],
            puntaje: 10,
            porcentaje: 25,
            palabras_clave_top: null,
          },
        ]),
      },
    };
    const repository = new PrismaRadarRepository(prisma as unknown as PrismaService);

    const snapshot = await repository.getLatestCalculation('graduate-id');

    expect(snapshot?.afinidad[0]).toEqual({
      areaId: RADAR_AREA_IDS['software-development'],
      puntaje: 10,
      porcentaje: 25,
      ponderacion: null,
      palabrasClaveTop: [],
    });
  });

  it('persiste dentro de la misma transaccion del bloqueo asesor sin anidar otra', async () => {
    const transaction = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      calculoRadar: {
        create: jest.fn().mockResolvedValue({
          id: 'calculation-id',
          id_titulado: 'graduate-id',
          hash_entrada: 'hash',
          estado: 'COMPLETADO',
          version_algoritmo: '1.0.0',
          fecha_calculo: new Date('2026-10-22T12:00:00.000Z'),
        }),
      },
      afinidadRadar: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
      palabraClaveNoMapeada: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        upsert: jest.fn().mockResolvedValue({}),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback: (client: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
      ),
    };
    const repository = new PrismaRadarRepository(prisma as unknown as PrismaService);
    const areas: AreaScoreRecord[] = [
      {
        areaSlug: 'software-development',
        areaId: RADAR_AREA_IDS['software-development'],
        puntaje: 15,
        porcentaje: 37.5,
        ponderacion: 5,
        palabrasClaveTop: [
          { keyword: 'javascript', weight: 5, frequency: 3, points: 15, percentage: 37.5 },
        ],
      },
    ];

    await repository.executeWithAdvisoryLock('graduate-id', (transactionalRepository) =>
      transactionalRepository.saveCalculation({
        tituladoId: 'graduate-id',
        hashEntrada: 'hash',
        estado: 'COMPLETADO',
        versionAlgoritmo: '1.0.0',
        areas,
        unmapped: [],
      }),
    );

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(transaction.$executeRaw).toHaveBeenCalledTimes(1);
    expect(transaction.calculoRadar.create).toHaveBeenCalledTimes(1);
    expect(transaction.afinidadRadar.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          id_area: RADAR_AREA_IDS['software-development'],
          palabras_clave_top: areas[0].palabrasClaveTop,
        }),
      ],
    });
  });
    it('guardar varias veces el mismo cálculo envía siempre los mismos términos y reemplaza la frecuencia (T15.4)', async () => {
    const transaction = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      calculoRadar: { create: jest.fn().mockResolvedValue({ id: 'calculation-id' }) },
      afinidadRadar: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
      palabraClaveNoMapeada: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };
    const prisma = {
      $transaction: jest.fn((callback: (tx: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
      ),
    };
    const repository = new PrismaRadarRepository(prisma as unknown as PrismaService);
    const unmapped = [
      { term: 'opentelemetry', count: 3 },
      { term: 'terraform-x', count: 1 },
    ];

    for (let run = 0; run < 3; run += 1) {
      await repository.saveCalculation({
        tituladoId: 'graduate-id',
        hashEntrada: 'hash',
        estado: 'COMPLETADO',
        versionAlgoritmo: '1.0.0',
        areas: [],
        unmapped,
      });
    }

    const inserts = transaction.$executeRaw.mock.calls.filter(([strings]) =>
      (strings as unknown as string[]).join(' ').includes('palabra_clave_no_mapeada'),
    );
    expect(inserts).toHaveLength(3);

    const payloads = inserts.map((call) => call[call.length - 1] as string);
    expect(new Set(payloads).size).toBe(1);
    expect(JSON.parse(payloads[0])).toEqual([
      { termino: 'opentelemetry', frecuencia: 3 },
      { termino: 'terraform-x', frecuencia: 1 },
    ]);

    const sql = (inserts[0][0] as unknown as string[]).join(' ');
    expect(sql).toMatch(/ON CONFLICT \(id_titulado, termino\) DO UPDATE/);
    expect(sql).toMatch(/frecuencia = EXCLUDED\.frecuencia/);
    expect(sql).not.toMatch(/frecuencia\s*\+|\+\s*EXCLUDED/);
  });
});
