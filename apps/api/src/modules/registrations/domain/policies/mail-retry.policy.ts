export const MAIL_MAX_ATTEMPTS = 3;
export const MAIL_ERROR_MAX_LENGTH = 500;

const RETRY_DELAYS_SECONDS = [60, 300, 900];

// Espera antes del siguiente intento, según cuántos intentos fallidos lleva el correo.
export function mailRetryDelaySeconds(failedAttempts: number): number {
  const index = Math.min(Math.max(failedAttempts, 1), RETRY_DELAYS_SECONDS.length) - 1;
  return RETRY_DELAYS_SECONDS[index] ?? 900;
}

export function describeMailError(error: unknown): string {
  const message = error instanceof Error && error.message ? error.message : 'Error desconocido';
  return message.slice(0, MAIL_ERROR_MAX_LENGTH);
}

export type MailNotificationStatus = 'pendiente' | 'enviada' | 'fallida';

// Estado de correo_tramite visto por el administrador (CA-14.8).
export function toNotificationStatus(state: string): MailNotificationStatus {
  const value = state.trim().toLowerCase();
  if (value === 'fallida' || value === 'fallido') {return 'fallida';}
  if (value === 'enviada' || value === 'enviado') {return 'enviada';}
  return 'pendiente';
}