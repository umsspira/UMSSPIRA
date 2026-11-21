import { BusinessRuleError } from '../../../../shared/errors/business-rule-error';
import { ReviewApplicationUseCase } from './review-application.use-case';

const actor = {} as never;

function setup(detail: Record<string, unknown> = {}) {
  const repository = {
    find: jest.fn().mockResolvedValue({
      fullName: 'Ana Perez',
      email: 'ana@example.com',
      status: 'PENDIENTE',
      version: 2,
      ...detail,
    }),
    findObservationReasons: jest
      .fn()
      .mockResolvedValue([{ code: 'documento_ilegible', label: 'Documento ilegible o borroso' }]),
    review: jest.fn().mockResolvedValue({ id: 'dictamen-1' }),
    countRejections: jest.fn().mockResolvedValue(0),
  };
  const security = {
    code: jest.fn().mockReturnValue('123456'),
    hash: jest.fn().mockReturnValue('hash'),
    seal: jest.fn((mail: unknown) => JSON.stringify(mail)),
  };
  const tokens = {
    issueLink: jest.fn().mockResolvedValue('https://portal.test/register/correction/abc'),
    revoke: jest.fn().mockResolvedValue(undefined),
  };
  const useCase = new ReviewApplicationUseCase(
    repository as never,
    security as never,
    tokens as never,
  );
  return { useCase, repository, tokens };
}

const observe = {
  decision: 'OBSERVADA' as const,
  motivos: ['documento_ilegible'],
  note: 'Sube un PDF nitido',
};

describe('HU-14 T-14.4: vista desactualizada y concurrencia', () => {
  it('rechaza una vista antigua sin emitir enlace ni guardar el dictamen', async () => {
    const { useCase, repository, tokens } = setup();
    await expect(
      useCase.execute(actor, 'app-1', { ...observe, expectedVersion: 1 }),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
    expect(tokens.issueLink).not.toHaveBeenCalled();
    expect(repository.review).not.toHaveBeenCalled();
  });

  it('rechaza una solicitud que ya no esta pendiente sin emitir enlace', async () => {
    const { useCase, repository, tokens } = setup({ status: 'APROBADA' });
    await expect(useCase.execute(actor, 'app-1', observe)).rejects.toMatchObject({
      code: 'APPLICATION_ALREADY_REVIEWED',
    });
    expect(tokens.issueLink).not.toHaveBeenCalled();
    expect(repository.review).not.toHaveBeenCalled();
  });

  it('guarda el dictamen cuando la vista esta vigente', async () => {
    const { useCase, repository } = setup();
    await useCase.execute(actor, 'app-1', { ...observe, expectedVersion: 2 });
    expect(repository.review).toHaveBeenCalledTimes(1);
  });

  it('quien pierde la carrera no revoca el enlace del ganador', async () => {
    const { useCase, repository, tokens } = setup();
    repository.review.mockRejectedValue(
      new BusinessRuleError('conflict', 'APPLICATION_ALREADY_REVIEWED', 'Ya revisada'),
    );
    await expect(useCase.execute(actor, 'app-1', observe)).rejects.toMatchObject({
      code: 'APPLICATION_ALREADY_REVIEWED',
    });
    expect(tokens.revoke).not.toHaveBeenCalled();
  });

  it('un fallo inesperado si revoca el enlace emitido', async () => {
    const { useCase, repository, tokens } = setup();
    repository.review.mockRejectedValue(new Error('db caida'));
    await expect(useCase.execute(actor, 'app-1', observe)).rejects.toThrow('db caida');
    expect(tokens.revoke).toHaveBeenCalledWith('app-1');
  });
});