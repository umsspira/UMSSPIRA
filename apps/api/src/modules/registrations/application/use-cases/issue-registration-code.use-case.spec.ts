
import { IssueRegistrationCodeUseCase } from './issue-registration-code.use-case';
import type { RegistrationRepository } from '../ports/registration-repository.port';
import type { RegistrationSecurity } from '../ports/registration-security.port';
import type { Notification } from '../contracts/registration-inputs';
import {
  CODE_SECONDS,
  RESEND_SECONDS,
} from '../../domain/policies/registration.policy';

describe('MAIL-02 - Correo del código de registro', () => {
  const token = 'token-de-prueba';
  const email = 'maria@example.com';

  function setup() {
    const draft = {
      id: 'draft-test',
      data: {
        correo: email,
        nombres: 'María José',
      },
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      applicationId: null,
      verified: false,
    };

    const repository = {
      findDraft: jest.fn().mockResolvedValue(draft),
      issueCode: jest.fn().mockResolvedValue('issued'),
    };

    const security = {
      hash: jest.fn(
        (purpose: string, value: string) =>
          `${purpose}:${value}`,
      ),
      code: jest.fn().mockReturnValue('001234'),
      seal: jest.fn((mail: Notification) =>
        JSON.stringify(mail),
      ),
    };

    const useCase = new IssueRegistrationCodeUseCase(
      repository as unknown as RegistrationRepository,
      security as unknown as RegistrationSecurity,
    );

    return { useCase, repository, security };
  }

  it('genera un correo HTML y texto plano con el código', async () => {
    const { useCase, security, repository } = setup();

    const result = await useCase.execute(token, email);
    const mail = security.seal.mock.calls[0][0];

    expect(mail.to).toBe(email);
    expect(mail.subject).toBe('Verifica tu correo en UMSSPIRA');

    // El texto conserva los ceros iniciales.
    expect(mail.text).toContain('001234');

    // El HTML utiliza el diseño institucional.
    expect(mail.html).toContain('UMSSPIRA');
    expect(mail.html).toContain('Verifica tu correo');
    expect(mail.html).toContain('<table');

    // El código aparece completo, aunque dividido en celdas.
    expect(
        [...(mail.html ?? '').matchAll(
        /<td align="center"[^>]*>(\d)<\/td>/g,
        )].map((match: RegExpMatchArray) => match[1]).join(''),
    ).toBe('001234');

    expect(repository.issueCode).toHaveBeenCalledWith(
      `draft:${token}`,
      `otp:${token}:001234`,
      expect.any(String),
      email,
    );

    expect(result).toEqual({
      maskedEmail: 'ma***@example.com',
      expiresInSeconds: CODE_SECONDS,
      resendAvailableInSeconds: RESEND_SECONDS,
    });
  });

  it('informa la vigencia máxima y el reenvío en texto plano', async () => {
    const { useCase, security } = setup();

    await useCase.execute(token, email);

    const mail = security.seal.mock.calls[0][0];

    expect(mail.text).toContain(
      `vigencia máxima de ${CODE_SECONDS / 60} minutos`,
    );
    expect(mail.text).toContain(
      'Puede vencer antes si expira tu registro',
    );
    expect(mail.text).toContain('Reenviar código');
    expect(mail.text).toContain(`${RESEND_SECONDS} segundos`);
  });

  it('diferencia verificación de aprobación y activación', async () => {
    const { useCase, security } = setup();

    await useCase.execute(token, email);

    const mail = security.seal.mock.calls[0][0];

    expect(mail.text).toContain(
      'No implica aprobación ni activación',
    );
  });

  it('permite generar un nuevo correo de reenvío', async () => {
    const { useCase, security, repository } = setup();

    await useCase.execute(token, email);

    security.code.mockReturnValue('654321');

    await useCase.execute(token, email);

    const firstMail = security.seal.mock.calls[0][0];
    const secondMail = security.seal.mock.calls[1][0];

    expect(firstMail.text).toContain('001234');
    expect(secondMail.text).toContain('654321');
    expect(repository.issueCode).toHaveBeenCalledTimes(2);
  });

  it('rechaza el reenvío cuando existe cooldown', async () => {
    const { useCase, repository } = setup();

    repository.issueCode.mockResolvedValue('cooldown');

    await expect(
      useCase.execute(token, email),
    ).rejects.toMatchObject({
      code: 'RESEND_COOLDOWN',
    });
  });

  it('acepta registros con nombres especiales', async () => {
    const { useCase, repository } = setup();

    repository.findDraft.mockResolvedValue({
      id: 'draft-test',
      data: {
        correo: email,
        nombres: 'María José <QA> & Co.',
      },
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      applicationId: null,
      verified: false,
    });

    await useCase.execute(token, email);

    expect(repository.issueCode).toHaveBeenCalledTimes(1);
  });

  it('no emite un código si el correo del registro cambió', async () => {
    const { useCase, repository } = setup();

    await expect(
      useCase.execute(token, 'otro@example.com'),
    ).rejects.toMatchObject({
      code: 'EMAIL_CHANGED',
    });

    expect(repository.issueCode).not.toHaveBeenCalled();
  });
});
