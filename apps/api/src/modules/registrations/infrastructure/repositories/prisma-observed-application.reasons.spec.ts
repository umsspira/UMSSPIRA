import { PrismaObservedApplicationRepository } from './prisma-observed-application.repository';

jest.mock('../../../../shared/infrastructure/database/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

function build(dictamenes: unknown[]) {
  const prisma = {
    solicitud: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'app-1',
        estado: 'OBSERVADA',
        detalle_solicitud: null,
        documento_respaldo: null,
        dictamen_registros: dictamenes,
        version_registros: [],
      }),
    },
  };
  return new PrismaObservedApplicationRepository(prisma as never);
}

describe('getObservedApplication con motivos', () => {
  it('devuelve las etiquetas de los motivos y la misma explicacion', async () => {
    const repository = build([
      {
        categoria: 'Documento ilegible o borroso',
        justificacion: 'Sube un PDF nitido',
        fecha_creacion: new Date('2026-11-13T10:00:00Z'),
        motivos: [
          { motivo: { etiqueta: 'Documento ilegible o borroso' } },
          { motivo: { etiqueta: 'Datos declarados no coinciden' } },
        ],
      },
    ]);
    const detail = await repository.getObservedApplication('app-1');
    expect(detail.observacion.motivos).toEqual([
      'Documento ilegible o borroso',
      'Datos declarados no coinciden',
    ]);
    expect(detail.observacion.justificacion).toBe('Sube un PDF nitido');
  });

  it('usa la categoria en una observacion anterior sin motivos', async () => {
    const repository = build([
      {
        categoria: 'Documento ilegible',
        justificacion: 'Repite la foto',
        fecha_creacion: new Date('2026-10-22T10:00:00Z'),
        motivos: [],
      },
    ]);
    const detail = await repository.getObservedApplication('app-1');
    expect(detail.observacion.motivos).toEqual(['Documento ilegible']);
    expect(detail.observacion.categoria).toBe('Documento ilegible');
  });

  it('devuelve una lista vacia si no hay dictamen', async () => {
    const detail = await build([]).getObservedApplication('app-1');
    expect(detail.observacion.motivos).toEqual([]);
  });
});