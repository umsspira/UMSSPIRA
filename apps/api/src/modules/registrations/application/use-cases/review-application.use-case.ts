import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { ReviewInput } from '../contracts/registration-inputs';
import { buildResolutionMail } from '../notifications/resolution-mail';
import type { ApplicationsRepository } from '../ports/applications-repository.port';
import type { RegistrationSecurity } from '../ports/registration-security.port';
import type { CorrectionTokenService } from '../services/correction-token.service';

export class ReviewApplicationUseCase {
  constructor(
    private readonly repository: ApplicationsRepository,
    private readonly security: RegistrationSecurity,
    private readonly tokenService: CorrectionTokenService,
  ) {}

  async execute(actor: ActorContext, id: string, input: ReviewInput) {
    const detail = await this.repository.find(actor, id);
    const code = input.decision === 'APROBADA' ? this.security.code() : null;

    let correctionUrl: string | undefined;
    if (input.decision === 'OBSERVADA') {
      correctionUrl = await this.tokenService.issueLink(id);
    }

    const mail = buildResolutionMail({
      decision: input.decision,
      applicationId: id,
      fullName: detail.fullName,
      code,
      category: input.category,
      note: input.note,
      correctionUrl,
    });

    try {
      return await this.repository.review(
        actor,
        id,
        input,
        code ? this.security.hash('activation', id + ':' + code) : null,
        this.security.seal({ to: detail.email, subject: mail.subject, text: mail.text }),
        { type: mail.type, to: detail.email, subject: mail.subject },
      );
    } catch (error) {
      if (input.decision === 'OBSERVADA') {
        await this.tokenService.revoke(id);
      }
      throw error;
    }
  }
}
