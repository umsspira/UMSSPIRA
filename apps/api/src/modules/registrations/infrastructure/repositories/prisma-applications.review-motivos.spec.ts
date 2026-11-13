
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { ReviewInput } from '../../application/contracts/registration-inputs';
import { PrismaApplicationsRepository } from './prisma-applications.repository';

jest.mock('../../../../shared/infrastructure/database/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

const actor = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Administrador Prueba',
  email: 'admin@ejemplo.com',
  scopes: { careerIds: ['carrera-1'] },
} as unknown as ActorContext;

const solicitudId = '22222222-2222-4222-8222-222222222222';
const dictamenId = '33333333-3333-4333-8333-333333333333';

type Motivo = {
  id: number;
  codigo: string;
  etiqueta: string;
  activo: boolean;
};

const catalogo: Motivo[] = [
  {
    id: 1,
    codigo: 'documento_ilegible',
    etiqueta: 'Documento ilegible o borroso',
    activo: true,
  },
  {
    id: 2,
    codigo: 'datos_no_coinciden',
    etiqueta: 'Datos declarados no coinciden',
    activo: true,
  },
  {
    id: 3,
    codigo: 'documento_incompleto',
    etiqueta: 'Documento incompleto',
    activo: false,
  },
];

function setup(motivos: Motivo[] = catalogo) {
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    solicitud: {
      findFirst: jest.fn().mockResolvedValue({
        estado: 'PENDIENTE',
        id_documento_respaldo: null,
      }),
      update: jest.fn().mockResolvedValue({}),
    },
    dictamen: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockResolvedValue({ id: dictamenId }),
    },
    motivoObservacion: {
      findMany: jest.fn().mockImplementation(
        async (args: {
          where: {
            codigo: { in: string[] };
            activo: boolean;
          };
        }) =>
          motivos
            .filter(
              (motivo) =>
                args.where.codigo.in.includes(motivo.codigo) &&
                (!args.where.activo || motivo.activo),
            )
            .map(({ id, codigo, etiqueta }) => ({
              id,
              codigo,
              etiqueta,
            })),
      ),
    },
    dictamenMotivo: {
      createMany: jest.fn().mockResolvedValue({ count: 2 }),
    },
    auditoriaDictamen: {
      create: jest.fn().mockResolvedValue({}),
    },
    correoPendiente: {
      create: jest.fn().mockResolvedValue({}),
    },
    correoTramite: {
      create: jest.fn().mockResolvedValue({}),
    },
  };

  const prisma = {
    $transaction: jest.fn(
      async (callback: (transaction: typeof tx) => Promise<unknown>) =>
        callback(tx),
    ),
  };

  const repository = new PrismaApplicationsRepository(prisma as never);

  const review = (input: ReviewInput) =>
    repository.review(
      actor,
      solicitudId,
      input,
      null,
      'encrypted-mail',
      {
        type: 'observacion',
        to: 'titulado@ejemplo.com',
        subject: 'Solicitud observada',
      },
    );

  return { tx, prisma, review };
}

const observacion: ReviewInput = {
  decision: 'OBSERVADA',
  motivos: ['documento_ilegible', 'datos_no_coinciden'],
  note: 'Adjuntar un documento legible y corregir los datos.',
};

describe('HU-16.1: persistencia de múltiples motivos', () => {
  it('guarda dos motivos asociados a un único dictamen', async () => {
    const { tx, prisma, review } = setup();

    const result = await review(observacion);

    expect(tx.dictamen.count).toHaveBeenCalledTimes(1);
    expect(tx.dictamen.count).toHaveBeenCalledWith({
      where: {
        id_solicitud: solicitudId,
        decision: {
          in: ['OBSERVADA', 'OBSERVED', 'OBSERVADO'],
        },
      },
    });

    expect(tx.dictamen.create).toHaveBeenCalledTimes(1);
    expect(tx.dictamen.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id_solicitud: solicitudId,
          decision: 'OBSERVADA',
          justificacion: observacion.note,
        }),
      }),
    );

    expect(tx.dictamenMotivo.createMany).toHaveBeenCalledTimes(1);
    expect(tx.dictamenMotivo.createMany).toHaveBeenCalledWith({
      data: [
        { id_dictamen: dictamenId, id_motivo: 1 },
        { id_dictamen: dictamenId, id_motivo: 2 },
      ],
    });

    expect(tx.solicitud.update).toHaveBeenCalledTimes(1);
    expect(tx.auditoriaDictamen.create).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      id: dictamenId,
      decision: 'OBSERVADA',
      note: observacion.note,
    });
  });

  it('rechaza motivos repetidos antes de crear el dictamen', async () => {
    const { tx, review } = setup();

    await expect(
      review({
        ...observacion,
        motivos: ['documento_ilegible', 'documento_ilegible'],
      }),
    ).rejects.toMatchObject({
      code: 'DUPLICATE_OBSERVATION_REASON',
    });

    expect(tx.dictamen.create).not.toHaveBeenCalled();
    expect(tx.dictamenMotivo.createMany).not.toHaveBeenCalled();
    expect(tx.solicitud.update).not.toHaveBeenCalled();
  });

  it('rechaza un motivo que no existe en el catálogo', async () => {
    const { tx, review } = setup();

    await expect(
      review({
        ...observacion,
        motivos: ['documento_ilegible', 'motivo_inexistente'],
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_OBSERVATION_REASON',
    });

    expect(tx.dictamen.create).not.toHaveBeenCalled();
    expect(tx.solicitud.update).not.toHaveBeenCalled();
  });

  it('rechaza un motivo inactivo', async () => {
    const { tx, review } = setup();

    await expect(
      review({
        ...observacion,
        motivos: ['documento_incompleto'],
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_OBSERVATION_REASON',
    });

    expect(tx.dictamen.create).not.toHaveBeenCalled();
  });

  it('mantiene la compatibilidad con observaciones anteriores', async () => {
    const { tx, review } = setup();

    await review({
      decision: 'OBSERVADA',
      category: 'Documento ilegible',
      note: 'El respaldo presentado no puede leerse correctamente.',
    });

    expect(tx.dictamen.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          categoria: 'Documento ilegible',
          justificacion:
            'El respaldo presentado no puede leerse correctamente.',
        }),
      }),
    );

    expect(tx.motivoObservacion.findMany).not.toHaveBeenCalled();
    expect(tx.dictamenMotivo.createMany).not.toHaveBeenCalled();
  });

  it('respeta el límite vigente de dos observaciones', async () => {
    const { tx, review } = setup();

    tx.dictamen.count.mockResolvedValueOnce(2);

    await expect(review(observacion)).rejects.toMatchObject({
      code: 'OBSERVATION_LIMIT_REACHED',
    });

    expect(tx.dictamen.create).not.toHaveBeenCalled();
    expect(tx.dictamenMotivo.createMany).not.toHaveBeenCalled();
  });

  it('detiene la operación si falla el guardado de motivos', async () => {
    const { tx, review } = setup();

    tx.dictamenMotivo.createMany.mockRejectedValueOnce(
      new Error('Error al guardar motivos'),
    );

    await expect(review(observacion)).rejects.toThrow(
      'Error al guardar motivos',
    );

    expect(tx.auditoriaDictamen.create).not.toHaveBeenCalled();
    expect(tx.solicitud.update).not.toHaveBeenCalled();
    expect(tx.correoPendiente.create).not.toHaveBeenCalled();
  });
});
