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

type Options = { estado?: string; version?: number; findings?: { status: string }[] | null };

function setup(options: Options = {}) {
  const ocrRows = options.findings ? [{ resultado: { findings: options.findings } }] : [];
  const tx = {
    // La primera llamada es el bloqueo de la fila; las siguientes, la lectura del OCR.
    $queryRaw: jest.fn().mockResolvedValueOnce([]).mockResolvedValue(ocrRows),
    solicitud: {
      findFirst: jest.fn().mockResolvedValue({
        estado: options.estado ?? 'PENDIENTE',
        id_documento_respaldo: null,
        version_vigente: options.version ?? 2,
      }),
      update: jest.fn().mockResolvedValue({}),
    },
    dictamen: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockResolvedValue({ id: 'dictamen-1' }),
    },
    motivoObservacion: { findMany: jest.fn().mockResolvedValue([]) },
    dictamenMotivo: { createMany: jest.fn() },
    auditoriaDictamen: { create: jest.fn().mockResolvedValue({}) },
    correoPendiente: { create: jest.fn().mockResolvedValue({}) },
    correoTramite: { create: jest.fn().mockResolvedValue({}) },
  };
  const prisma = {
    $transaction: jest.fn(async (callback: (transaction: typeof tx) => Promise<unknown>) =>
      callback(tx),
    ),
  };
  const repository = new PrismaApplicationsRepository(prisma as never);
  const review = (input: ReviewInput) =>
    repository.review(actor, 'solicitud-1', input, 'hash', 'cifrado', {
      type: 'aprobacion',
      to: 'titulado@ejemplo.com',
      subject: 'Asunto',
    });
  return { tx, review };
}

describe('HU-14 T-14.4: dictamen sobre la version vigente', () => {
  it('rechaza una vista desactualizada sin crear dictamen ni correo', async () => {
    const { tx, review } = setup({ version: 3 });
    await expect(review({ decision: 'APROBADA', expectedVersion: 2 })).rejects.toMatchObject({
      code: 'VERSION_CONFLICT',
    });
    expect(tx.dictamen.create).not.toHaveBeenCalled();
    expect(tx.correoTramite.create).not.toHaveBeenCalled();
  });

  it('informa que ya fue revisada aunque la version tampoco coincida', async () => {
    const { tx, review } = setup({ estado: 'OBSERVADA', version: 3 });
    await expect(review({ decision: 'APROBADA', expectedVersion: 2 })).rejects.toMatchObject({
      code: 'APPLICATION_ALREADY_REVIEWED',
    });
    expect(tx.dictamen.create).not.toHaveBeenCalled();
  });

  it('guarda la version dictaminada cuando la vista esta vigente', async () => {
    const { tx, review } = setup({ version: 2 });
    await review({ decision: 'APROBADA', expectedVersion: 2 });
    expect(tx.dictamen.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ version_dictaminada: 2 }),
      }),
    );
    expect(tx.dictamen.create).toHaveBeenCalledTimes(1);
  });

  it('acepta el dictamen si no se envia expectedVersion', async () => {
    const { tx, review } = setup();
    await review({ decision: 'APROBADA' });
    expect(tx.dictamen.create).toHaveBeenCalledTimes(1);
  });

  it('conserva la nota de aprobacion solo para uso interno', async () => {
    const note = 'Diferencia menor confirmada en el original';
    const { tx, review } = setup();
    await review({ decision: 'APROBADA', note });
    expect(tx.dictamen.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ justificacion: null }) }),
    );
    expect(tx.auditoriaDictamen.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          detalle: expect.objectContaining({ notaInterna: note }),
        }),
      }),
    );
  });

  it('exige nota interna al aprobar con una posible diferencia', async () => {
    const { tx, review } = setup({ findings: [{ status: 'COINCIDE' }, { status: 'POSIBLE_DIFERENCIA' }] });
    await expect(review({ decision: 'APROBADA' })).rejects.toMatchObject({
      code: 'INTERNAL_NOTE_REQUIRED',
    });
    expect(tx.dictamen.create).not.toHaveBeenCalled();
  });

  it('permite aprobar con una diferencia si se deja la nota', async () => {
    const { tx, review } = setup({ findings: [{ status: 'POSIBLE_DIFERENCIA' }] });
    await review({ decision: 'APROBADA', note: 'Diferencia confirmada como menor' });
    expect(tx.dictamen.create).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['todo coincide', [{ status: 'COINCIDE' }]],
    ['no hay lectura', null],
  ])('no exige nota cuando %s', async (_caso, findings) => {
    const { tx, review } = setup({ findings });
    await review({ decision: 'APROBADA' });
    expect(tx.dictamen.create).toHaveBeenCalledTimes(1);
  });
});