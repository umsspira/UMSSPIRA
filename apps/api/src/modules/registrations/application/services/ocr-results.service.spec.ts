import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import type { OcrReading, OcrResult } from '@umsspira/shared-types';
import { OcrResultsService } from './ocr-results.service';

jest.mock('../../domain/policies/ocr-rules', () => ({
  compareOcr: jest.fn().mockReturnValue({
    findings: [],
    suggestion: 'OBSERVAR',
    reason: 'Se detectaron diferencias.',
    reading: {
      lines: [],
      pagesRead: 1,
      totalPages: 1,
      partial: false,
      engine: 'test',
      loadMs: 1,
      readMs: 1,
    },
    rulesVersion: '1',
  } satisfies OcrResult),
}));

describe('OcrResultsService', () => {
  it('registra la sugerencia OCR como evento de sistema en la versión analizada', async () => {
    const tx = {
      $executeRaw: jest.fn(),
      historialEvento: { create: jest.fn().mockResolvedValue({}) },
    };
    const queue = {
      withLease: jest.fn(
        async (
          _actor: ActorContext,
          _id: string,
          _token: string,
          action: (transaction: typeof tx, row: {
            id_solicitud: string;
            revision: number;
            declarado: Record<string, unknown>;
          }) => Promise<unknown>,
        ) =>
          action(tx, {
            id_solicitud: 'application-id',
            revision: 4,
            declarado: {},
          }),
      ),
    };
    const service = new OcrResultsService(
      {} as PrismaService,
      queue as never,
    );

    await service.complete(
      {} as ActorContext,
      'job-id',
      'lease-token',
      {} as OcrReading,
    );

    expect(tx.historialEvento.create).toHaveBeenCalledWith({
      data: {
        id_solicitud: 'application-id',
        version: 4,
        tipo_actor: 'SISTEMA',
        accion: 'OCR_ANALISIS',
        detalle: 'Sugerencia del OCR: OBSERVAR.',
      },
    });
  });
});
