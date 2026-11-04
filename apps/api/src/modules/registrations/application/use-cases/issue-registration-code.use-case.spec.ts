import { IssueRegistrationCodeUseCase } from './issue-registration-code.use-case';

it('encola el mismo OTP en texto y HTML sin cambiar su duración', async () => {
  const repository = {
    findDraft: jest.fn().mockResolvedValue({
      expiresAt: new Date(Date.now() + 60_000), applicationId: null,
      data: { correo: 'ana@example.com' },
    }),
    issueCode: jest.fn().mockResolvedValue('issued'),
  };
  const security = {
    hash: jest.fn().mockReturnValue('hash'), code: jest.fn().mockReturnValue('123456'),
    seal: jest.fn().mockReturnValue('encrypted'),
  };
  const useCase = new IssueRegistrationCodeUseCase(repository as never, security as never, 'https://web.test');
  expect(await useCase.execute('session')).toMatchObject({ expiresInSeconds: 300 });
  expect(security.seal).toHaveBeenCalledWith(expect.objectContaining({
    to: 'ana@example.com', text: 'Tu código de verificación es 123456. Vence en 5 minutos.',
    html: expect.stringContaining('https://web.test/assets/events/umsspira-logo-desktop.png'),
  }));
  expect(repository.issueCode).toHaveBeenCalledWith('hash', 'hash', 'encrypted', 'ana@example.com');
});
