import { BusinessRuleError } from '../../../../shared/errors/business-rule-error';
import {
  assertOpenDraft,
  CODE_SECONDS,
  RESEND_SECONDS,
} from '../../domain/policies/registration.policy';
import type { RegistrationRepository } from '../ports/registration-repository.port';
import type { RegistrationSecurity } from '../ports/registration-security.port';
import { registrationCodeHtml } from '../../../../shared/notifications/account-email';
export class IssueRegistrationCodeUseCase {
  constructor(
    private readonly repository: RegistrationRepository,
    private readonly security: RegistrationSecurity,
  ) {}
  async execute(token: string, expectedEmail?: string) {
    const hash = this.security.hash('draft', token);
    const draft = await this.repository.findDraft(hash);
    assertOpenDraft(draft);
    if (expectedEmail && expectedEmail !== draft.data.correo) {
      throw new BusinessRuleError(
        'conflict',
        'EMAIL_CHANGED',
        'El correo cambió. Vuelve al resumen',
      );
    }
    const code = this.security.code();
    const origin = process.env.WEB_BASE_URL || 'http://localhost:3001';
    const mail = this.security.seal({
      to: draft.data.correo,
      subject: 'Verifica tu correo en UMSSPIRA',
      text: [
      'Tu código de verificación es: ' + code,
      '',
      `Tiene una vigencia máxima de ${CODE_SECONDS / 60} minutos.`,
      'Puede vencer antes si expira tu registro.',
      '',
      'Si necesitas otro código, vuelve a la pantalla',
      'de verificación y selecciona «Reenviar código».',
      `Debes esperar ${RESEND_SECONDS} segundos entre envíos.`,
      'El código anterior dejará de funcionar.',
      '',
      'Este código solo verifica tu correo.',
      'No implica aprobación ni activación de tu cuenta.',
      '',
      'Si no solicitaste este código, ignora este mensaje.',
      ].join('\n'),
      html: registrationCodeHtml(
      code,
      origin,
      CODE_SECONDS / 60,
      ),
    });
    const result = await this.repository.issueCode(
      hash,
      this.security.hash('otp', token + ':' + code),
      mail,
      draft.data.correo,
    );
    if (result === 'verified') {
      throw new BusinessRuleError(
        'conflict',
        'EMAIL_ALREADY_VERIFIED',
        'El correo ya está verificado',
      );
    }
    if (result === 'cooldown') {
      throw new BusinessRuleError('limited', 'RESEND_COOLDOWN', 'Espera 60 segundos entre envíos');
    }
    const [local, domain] = draft.data.correo.split('@');
    return {
      maskedEmail: local.slice(0, 2) + '***@' + domain,
      expiresInSeconds: CODE_SECONDS,
      resendAvailableInSeconds: RESEND_SECONDS,
    };
  }
}
