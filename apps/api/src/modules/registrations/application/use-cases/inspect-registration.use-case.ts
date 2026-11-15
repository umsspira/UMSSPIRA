import {
  assertOpenDraft,
  RESEND_SECONDS,
  secondsUntil,
} from '../../domain/policies/registration.policy';
import type { RegistrationRepository } from '../ports/registration-repository.port';
import type { RegistrationSecurity } from '../ports/registration-security.port';

export class InspectRegistrationUseCase {
  constructor(
    private readonly repository: RegistrationRepository,
    private readonly security: RegistrationSecurity,
  ) {}

  async execute(token: string) {
    const draft = await this.repository.findDraft(this.security.hash('draft', token));
    assertOpenDraft(draft);
    const now = Date.now();
    const hasVerificationCode = Boolean(draft.codeSentAt);
    return {
      sessionToken: token,
      expiresInSeconds: Math.max(0, Math.floor((draft.expiresAt.getTime() - now) / 1000)),
      isEmailVerified: draft.verified,
      hasVerificationCode,
      codeExpiresInSeconds: hasVerificationCode ? secondsUntil(draft.codeExpiresAt, now) : 0,
      resendAvailableInSeconds: draft.codeSentAt
        ? secondsUntil(new Date(draft.codeSentAt.getTime() + RESEND_SECONDS * 1000), now)
        : 0,
    };
  }
}
