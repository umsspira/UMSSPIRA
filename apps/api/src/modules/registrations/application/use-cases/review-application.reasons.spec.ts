import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { ReviewApplicationUseCase } from './review-application.use-case';

const actor = {} as unknown as ActorContext;

function setup() {
  const repository = {
    find: jest.fn().mockResolvedValue({ fullName: 'Ana Perez', email: 'ana@example.com' }),
    findObservationReasons: jest.fn().mockResolvedValue([
      { code: 'datos_no_coinciden', label: 'Datos declarados no coinciden' },
      { code: 'documento_ilegible', label: 'Documento ilegible o borroso' },
    ]),
    review: jest.fn().mockResolvedValue({ id: 'dictamen-1' }),
    countRejections: jest.fn().mockResolvedValue(0),
  };
  const security = {
    code: jest.fn(),
    hash: jest.fn(),
    seal: jest.fn((mail: unknown) => JSON.stringify(mail)),
  };
  const tokens = {
    issueLink: jest.fn().mockResolvedValue('https://portal.test/register/correction/abc'),
  };
  const useCase = new ReviewApplicationUseCase(
    repository as never,
    security as never,
    tokens as never,
  );
  return { useCase, repository, security };
}

const sealedText = (security: { seal: jest.Mock }) =>
  (security.seal.mock.calls[0][0] as { text: string }).text;

describe('ReviewApplicationUseCase con varios motivos', () => {
  it('muestra las etiquetas en el orden elegido y una sola explicacion', async () => {
    const { useCase, security } = setup();
    await useCase.execute(actor, 'app-1', {
      decision: 'OBSERVADA',
      motivos: ['documento_ilegible', 'datos_no_coinciden'],
      note: 'Sube un PDF nitido',
    });
    const text = sealedText(security);
    expect(text.indexOf('Documento ilegible o borroso')).toBeLessThan(
      text.indexOf('Datos declarados no coinciden'),
    );
    expect(text).toContain('Justificación del auditor: Sube un PDF nitido');
    expect(text).not.toContain('documento_ilegible');
  });

  it('guarda el dictamen con los mismos motivos que se enviaron', async () => {
    const { useCase, repository } = setup();
    const input = {
      decision: 'OBSERVADA' as const,
      motivos: ['documento_ilegible'],
      note: 'Repite la foto',
    };
    await useCase.execute(actor, 'app-1', input);
    expect(repository.review).toHaveBeenCalledWith(
      actor,
      'app-1',
      input,
      null,
      expect.any(String),
      expect.objectContaining({ type: 'observacion' }),
    );
  });

  it('mantiene el formato de una observacion antigua sin consultar motivos', async () => {
    const { useCase, repository, security } = setup();
    await useCase.execute(actor, 'app-1', {
      decision: 'OBSERVADA',
      category: 'Documento ilegible',
      note: 'Repite la foto',
    });
    expect(repository.findObservationReasons).not.toHaveBeenCalled();
    expect(sealedText(security)).toContain('Categoría de observación: Documento ilegible');
  });
});