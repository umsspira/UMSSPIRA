import { InspectRegistrationUseCase } from './inspect-registration.use-case';
import type { RegistrationDraft } from '../../domain/entities/registration';
import type { RegistrationRepository } from '../ports/registration-repository.port';
import type { RegistrationSecurity } from '../ports/registration-security.port';

describe('InspectRegistrationUseCase', () => {
  const now = new Date('2026-11-12T10:00:00.000Z').getTime();
  const draft: RegistrationDraft = {
    id: 'draft-id',
    data: {
      nombres: 'Ana',
      apellidos: 'Pérez',
      ci: '12345678',
      complementoCi: '',
      expedidoEn: 'CB',
      correo: 'ana@example.com',
      telefono: '77777777',
      carreraId: 'career-id',
      anioEgreso: 2025,
      codigoSis: '202012345',
    },
    expiresAt: new Date(now + 60 * 60 * 1000),
    codeExpiresAt: new Date(now + 127 * 1000),
    codeSentAt: new Date(now - 29 * 1000),
    verified: false,
    applicationId: null,
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the remaining OTP expiry and resend cooldown from persisted timestamps', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(now);
    const repository = {
      findDraft: jest.fn().mockResolvedValue(draft),
    } as unknown as RegistrationRepository;
    const security = {
      hash: jest.fn().mockReturnValue('draft-hash'),
    } as unknown as RegistrationSecurity;
    const useCase = new InspectRegistrationUseCase(repository, security);

    await expect(useCase.execute('session-token')).resolves.toEqual({
      sessionToken: 'session-token',
      expiresInSeconds: 3600,
      isEmailVerified: false,
      hasVerificationCode: true,
      codeExpiresInSeconds: 127,
      resendAvailableInSeconds: 31,
    });
  });

  it('reports no OTP when the draft has never received a code', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(now);
    const repository = {
      findDraft: jest.fn().mockResolvedValue({
        ...draft,
        codeExpiresAt: null,
        codeSentAt: null,
      }),
    } as unknown as RegistrationRepository;
    const security = {
      hash: jest.fn().mockReturnValue('draft-hash'),
    } as unknown as RegistrationSecurity;
    const useCase = new InspectRegistrationUseCase(repository, security);

    await expect(useCase.execute('session-token')).resolves.toMatchObject({
      hasVerificationCode: false,
      codeExpiresInSeconds: 0,
      resendAvailableInSeconds: 0,
    });
  });
});
