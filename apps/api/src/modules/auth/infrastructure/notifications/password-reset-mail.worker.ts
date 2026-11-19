import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import type { Environment } from '../../../../config/environment';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { recoveryLinkState } from '../../domain/policies/password-recovery.policy';
import { passwordRecoveryHtml } from '../../../../shared/notifications/account-email';

interface PendingMail {
  id: string;
  email_destino: string;
  asunto: string;
  cuerpo: string | null;
  intentos: number;
  max_intentos: number;
  token: { id_usuario: string; expira_en: Date; usado_en: Date | null; revocado: boolean };
}
// Describe el fallo sin volcar el mensaje completo: los de SMTP pueden incluir la dirección
// del destinatario. Los de Brevo son "Brevo HTTP <estado>" y se conservan.
function describeFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (message.startsWith('Brevo HTTP')) {
    return message;
  }
  const code = (error as { code?: unknown } | null)?.code;
  if (typeof code === 'string') {
    return code;
  }
  return error instanceof Error ? error.name : 'ErrorDesconocido';
}
// Envía los correos de recuperación de la tabla password_reset_correo (CA-12.4).
// Usa BREVO_API_KEY si está configurada; si no, SMTP_URL. Ambos usan MAIL_FROM.
// El cuerpo lleva el enlace con el token en claro,
// por eso se borra en cuanto el correo se entrega o falla de forma definitiva.
@Injectable()
export class PasswordResetMailWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PasswordResetMailWorker.name);
  private timer?: NodeJS.Timeout;
  private transport?: Transporter;
  private running = false;
  private task?: Promise<void>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Environment, true>,
  ) {}

  onModuleInit(): void {
    if (this.config.get('NODE_ENV') === 'test') {
      return;
    }
    this.transport = createTransport({
      url: this.config.get<string>('SMTP_URL', 'smtp://127.0.0.1:1025'),
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
    });
    this.timer = setInterval(() => {
      if (!this.running) {
        this.task = this.drain();
      }
    }, 5000);
    this.timer.unref();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
    }
    await this.task;
    this.transport?.close();
  }

  async drain(): Promise<void> {
    if (this.running || !this.transport) {
      return;
    }
    this.running = true;
    try {
      const rows = await this.prisma.passwordResetCorreo.findMany({
        where: { estado: 'pendiente', siguiente_intento_en: { lte: new Date() } },
        include: { token: true },
        orderBy: { creado_en: 'asc' },
        take: 10,
      });
      for (const row of rows) {
        await this.deliver(row);
      }
    } catch (error) {
      this.logger.warn(
        `No se pudo consultar la cola de correos de recuperación: ${describeFailure(error)}`,
      );
    } finally {
      this.running = false;
    }
  }

  private async deliver(row: PendingMail): Promise<void> {
    const now = new Date();
    // La reserva permite varios procesos: solo uno envía cada correo.
    const claimed = await this.prisma.passwordResetCorreo.updateMany({
      where: { id: row.id, estado: 'pendiente', siguiente_intento_en: { lte: now } },
      data: { siguiente_intento_en: new Date(now.getTime() + 60_000), intentos: { increment: 1 } },
    });
    if (!claimed.count) {
      return;
    }

    // No se envía un enlace que ya no sirve (usado, reemplazado o vencido mientras esperaba).
    const state = recoveryLinkState(
      { expiresAt: row.token.expira_en, usedAt: row.token.usado_en, revoked: row.token.revocado },
      now,
    );
    if (state !== 'valid' || !row.cuerpo) {
      await this.prisma.passwordResetCorreo.update({
        where: { id: row.id },
        data: { estado: 'fallida', cuerpo: null, ultimo_error: 'enlace_no_vigente', actualizado_en: now },
      });
      return;
    }

    const attempt = row.intentos + 1;
    try {
      const info = await this.sendMail(row, row.cuerpo);
      await this.prisma.passwordResetCorreo.update({
        where: { id: row.id },
        data: {
          estado: 'enviada',
          cuerpo: null,
          fecha_envio: now,
          smtp_message_id: String(info?.messageId ?? '').slice(0, 255) || null,
          ultimo_error: null,
          actualizado_en: now,
        },
      });
      await this.event(row, 'enlace_enviado', now);
    } catch (error) {
      const finalAttempt = attempt >= row.max_intentos;
      const reason = describeFailure(error);
      await this.prisma.passwordResetCorreo.update({
        where: { id: row.id },
        data: {
          estado: finalAttempt ? 'fallida' : 'pendiente',
          ...(finalAttempt ? { cuerpo: null } : {}),
          siguiente_intento_en: new Date(now.getTime() + attempt * 120_000),
          ultimo_error: String((error as Error)?.message ?? 'error_smtp').slice(0, 500),
          actualizado_en: now,
        },
      });
      if (finalAttempt) {
        await this.event(row, 'error_smtp', now);
        this.logger.error(`El correo ${row.id} agotó sus intentos: ${reason}`);
      } else {
        this.logger.warn(
          `No se entregó el correo ${row.id}; intento ${attempt}/${row.max_intentos}: ${reason}`,
        );
      }
    }
  }

  private async sendMail(row: PendingMail, text: string): Promise<{ messageId?: string }> {
    const html = passwordRecoveryHtml(text, this.config.get<string>('WEB_BASE_URL', 'http://localhost:3001'));
    const from = this.config.get<string>('MAIL_FROM', 'UMSSPIRA <no-reply@umsspira.local>');
    const apiKey = this.config.get<string>('BREVO_API_KEY');
    if (!apiKey) {
      return this.transport!.sendMail({
        from, to: row.email_destino, subject: row.asunto, text, html,
        messageId: `<${row.id}@umsspira.local>`,
      });
    }

    const match = from.match(/^(?:(.*)<)?([^>]+)>?$/);
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      signal: AbortSignal.timeout(10_000),
      headers: { accept: 'application/json', 'content-type': 'application/json', 'api-key': apiKey },
      body: JSON.stringify({
        sender: { name: match?.[1]?.trim() || 'UMSSPIRA', email: match?.[2]?.trim() || from },
        to: [{ email: row.email_destino }],
        subject: row.asunto,
        textContent: text,
        htmlContent: html,
      }),
    });
    if (!response.ok) {
      // No guardar respuestas del proveedor que puedan contener el enlace de recuperación.
      throw new Error(`Brevo HTTP ${response.status}`);
    }
    const result = await response.json() as { messageId?: string };
    return { messageId: result.messageId };
  }

  private async event(row: PendingMail, type: string, at: Date): Promise<void> {
    await this.prisma.passwordResetEvento.create({
      data: { usuario_id: row.token.id_usuario, correo_normalizado: row.email_destino, tipo: type, creado_en: at },
    });
  }
}
