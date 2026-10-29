import { Logger } from '@nestjs/common';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { ReviewInput } from '../contracts/registration-inputs';
import { buildObservedMail } from '../notifications/observed-mail';
import { buildResolutionMail } from '../notifications/resolution-mail';
import type { ApplicationsRepository } from '../ports/applications-repository.port';
import type { RegistrationSecurity } from '../ports/registration-security.port';

export interface CorrectionLinkIssuer {
  issueLink(applicationId: string): Promise<string>;
}

export class ReviewApplicationUseCase {
  private readonly logger = new Logger(ReviewApplicationUseCase.name);

  constructor(
    private readonly repository: ApplicationsRepository,
    private readonly security: RegistrationSecurity,
    private readonly correctionLinks?: CorrectionLinkIssuer,
  ) {}

  async execute(actor: ActorContext, id: string, input: ReviewInput) {
    const detail = await this.repository.find(actor, id);
    const code = input.decision === 'APROBADA' ? this.security.code() : null;
    const correctionUrl = await this.issueCorrectionLink(id, input);
    const mail =
      input.decision === 'OBSERVADA' && correctionUrl
        ? buildObservedMail({
            fullName: detail.fullName,
            category: input.category ?? '',
            note: input.note ?? '',
            correctionUrl,
          })
        : buildResolutionMail({
            decision: input.decision,
            applicationId: id,
            fullName: detail.fullName,
            code,
            category: input.category,
            note: input.note,
            correctionUrl: correctionUrl ?? undefined,
          });
    return this.repository.review(
      actor,
      id,
      input,
      code ? this.security.hash('activation', id + ':' + code) : null,
      this.security.seal({
        to: detail.email,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      }),
      { type: mail.type, to: detail.email, subject: mail.subject },
    );
  }

  private async issueCorrectionLink(id: string, input: ReviewInput): Promise<string | null> {
    if (input.decision !== 'OBSERVADA' || !this.correctionLinks) {
      return null;
    }
    try {
      return await this.correctionLinks.issueLink(id);
    } catch (error) {
      // el dictamen no depende del enlace: el titulado podra pedirlo despues
      const reason =
        error instanceof Error ? `${error.name}: ${error.message.split('\n').pop()}` : String(error);
      this.logger.error(
        `No se pudo generar el enlace de correccion para el correo de observado (${reason})`,
      );
      return null;
    }
  }
}