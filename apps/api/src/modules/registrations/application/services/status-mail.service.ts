import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma } from '../../../../generated/prisma/client';
import type { Environment } from '../../../../config/environment';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import type { StatusMailDispatcher, StatusQueryTarget } from '../contracts/request-status.dto';
import { REGISTRATION_SECURITY, type RegistrationSecurity } from '../ports/registration-security.port';
import { APPLICATIONS_REPOSITORY, type ApplicationsRepository } from '../ports/applications-repository.port';
import { ActivationAccessService } from './activation-access.service';
import { CorrectionTokenService } from './correction-token.service';
import { buildObservedMail } from '../notifications/observed-mail';
import { buildRejectedMail } from '../notifications/rejected-mail';
import { buildAccountAlreadyActiveMail } from '../notifications/account-already-active';
import { buildStatusPendingMail } from '../notifications/status-pending';
import { queueTrackedMail } from '../../infrastructure/notifications/queue-mail';
import {
  CORRECTION_REQUEST_COOLDOWN_SECONDS,
  CORRECTION_REQUEST_DAILY_LIMIT,
} from '../../domain/policies/correction.policy';

const MAX_REJECTIONS = 5;

// Servicio de correos de estado para la consulta publica (CA-18.2 a CA-18.7).
// Reutiliza los correos de dictamen existentes sin volver a dictaminar ni modificar contadores.
@Injectable()
export class StatusMailService implements StatusMailDispatcher {
  private readonly logger = new Logger(StatusMailService.name);
  private readonly webBaseUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REGISTRATION_SECURITY) private readonly security: RegistrationSecurity,
    private readonly activationAccessService: ActivationAccessService,
    private readonly correctionTokenService: CorrectionTokenService,
    config: ConfigService<Environment, true>,
    @Optional() @Inject(APPLICATIONS_REPOSITORY) private readonly applicationsRepo?: ApplicationsRepository,
  ) {
    this.webBaseUrl = config.get('WEB_BASE_URL', { infer: true }) ?? 'http://localhost:3001';
  }

  async dispatch(target: StatusQueryTarget): Promise<void> {
    try {
      switch (target.kind) {
        case 'aprobada_por_activar':
          await this.handleApprovedPendingActivation(target);
          break;
        case 'aprobada_activa':
          await this.handleApprovedActive(target);
          break;
        case 'observada':
          await this.handleObserved(target);
          break;
        case 'rechazada':
          await this.handleRejected(target);
          break;
        case 'pendiente':
          await this.handlePending(target);
          break;
        default:
          this.logger.warn('Estado de consulta no reconocido');
      }
    } catch (error) {
      const reason = error instanceof Error ? error.name : 'desconocido';
      this.logger.error(`Fallo el envio del correo de estado (${reason})`);
    }
  }

  private webOrigin(): string {
    return this.webBaseUrl.replace(/\/+$/, '');
  }

  private async enqueue(
    tx: Prisma.TransactionClient,
    target: StatusQueryTarget,
    mail: { subject: string; text: string; html: string },
    type: 'aprobacion' | 'observacion' | 'rechazo',
    reviewId?: string,
  ): Promise<void> {
    await queueTrackedMail(tx, {
      encrypted: this.security.seal({
        to: target.email,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      }),
      expiresAt: new Date(Date.now() + 86400 * 1000),
      applicationId: target.applicationId,
      reviewId,
      type,
      to: target.email,
      subject: mail.subject,
    });
  }

  // Aprobada con activacion pendiente: delega en el reenvio vigente (CA-18.4).
  private async handleApprovedPendingActivation(target: StatusQueryTarget): Promise<void> {
    await this.activationAccessService.resend(target.applicationId);
  }

  // Cuenta ya activa: envia aviso institucional sin codigo ni activacion (CA-18.5).
  private async handleApprovedActive(target: StatusQueryTarget): Promise<void> {
    const mail = buildAccountAlreadyActiveMail({
      fullName: target.fullName,
      origin: this.webOrigin(),
    });
    await this.prisma.$transaction((tx) => this.enqueue(tx, target, mail, 'aprobacion'));
  }

  // Pendiente: aviso breve indicando que continua en revision (CA-18.6).
  private async handlePending(target: StatusQueryTarget): Promise<void> {
    const mail = buildStatusPendingMail({
      fullName: target.fullName,
      applicationId: target.applicationId,
      origin: this.webOrigin(),
    });
    await this.prisma.$transaction((tx) => this.enqueue(tx, target, mail, 'aprobacion'));
  }

  // Observada: reutiliza el correo y motivos existentes con acceso de correccion (CA-18.3).
  private async handleObserved(target: StatusQueryTarget): Promise<void> {
    const app = await this.prisma.solicitud.findUnique({
      where: { id: target.applicationId },
      include: {
        dictamen_registros: {
          orderBy: { fecha_creacion: 'desc' },
          take: 1,
          include: { motivos: { include: { motivo: true }, orderBy: { id_motivo: 'asc' } } },
        },
      },
    });

    const review = app?.dictamen_registros?.[0];
    const reasons = (review?.motivos ?? []).map((link) => link.motivo.etiqueta);
    const category = review?.categoria ?? undefined;
    const explanation = review?.justificacion ?? undefined;

    const now = Date.now();
    const cooldownThreshold = new Date(now - CORRECTION_REQUEST_COOLDOWN_SECONDS * 1000);
    const dailyThreshold = new Date(now - 86400 * 1000);

    const recentTokens = await this.prisma.tokenSubsanacion.findMany({
      where: { id_solicitud: target.applicationId, created_at: { gte: dailyThreshold } },
      orderBy: { created_at: 'desc' },
    });

    if (recentTokens.length >= CORRECTION_REQUEST_DAILY_LIMIT) {
      this.logger.warn('Peticion de enlace de subsanacion ignorada: limite diario alcanzado');
      return;
    }

    if (recentTokens.length > 0 && recentTokens[0].created_at >= cooldownThreshold) {
      this.logger.warn('Peticion de enlace de subsanacion ignorada: cooldown activo');
      return;
    }

    const correctionUrl = await this.correctionTokenService.issueLink(target.applicationId);
    const mail = buildObservedMail({
      fullName: target.fullName,
      reasons,
      category,
      explanation,
      correctionUrl,
      origin: this.webOrigin(),
    });

    await this.prisma.$transaction((tx) =>
      this.enqueue(tx, target, mail, 'observacion', review?.id),
    );
  }

  // Rechazada: reutiliza el correo de rechazo con justificacion comunicable (CA-18.3).
  private async handleRejected(target: StatusQueryTarget): Promise<void> {
    const app = await this.prisma.solicitud.findUnique({
      where: { id: target.applicationId },
      include: {
        dictamen_registros: { orderBy: { fecha_creacion: 'desc' }, take: 1 },
      },
    });

    const review = app?.dictamen_registros?.[0];
    const category = review?.categoria ?? null;
    const note = review?.justificacion ?? null;

    let remainingAttempts: number | null = null;
    if (this.applicationsRepo) {
      try {
        const totalRejections = await this.applicationsRepo.countRejections(target.applicationId);
        remainingAttempts = Math.max(0, MAX_REJECTIONS - totalRejections);
      } catch {
        this.logger.warn('No se pudo calcular los intentos restantes de rechazo');
      }
    }

    const mail = buildRejectedMail({
      fullName: target.fullName,
      category,
      note,
      remainingAttempts,
      origin: this.webOrigin(),
    });

    await this.prisma.$transaction((tx) =>
      this.enqueue(tx, target, mail, 'rechazo', review?.id),
    );
  }
}
