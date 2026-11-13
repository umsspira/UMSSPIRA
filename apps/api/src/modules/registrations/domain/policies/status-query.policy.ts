export type StatusQueryState = 'pendiente' | 'observada' | 'rechazada' | 'aprobada';

// Provisional hasta que INT-01 fije los valores definitivos (espera y máximos).
export const STATUS_QUERY_WINDOW_MS = 60 * 60 * 1000;
export const STATUS_QUERY_EMAIL_LIMIT = 3;
// Más alto que el de recuperación: detrás de un proxy varias personas comparten la IP.
export const STATUS_QUERY_ORIGIN_LIMIT = 20;
export const STATUS_QUERY_COOLDOWN_MS = 60_000;

// Única fuente de verdad. Un estado que no aparezca aquí (borradores, por ejemplo) nunca coincide.
export const STATUS_QUERY_STATES: Readonly<Record<string, StatusQueryState>> = {
  PENDIENTE: 'pendiente',
  PENDING: 'pendiente',
  OBSERVADA: 'observada',
  OBSERVED: 'observada',
  RECHAZADA: 'rechazada',
  REJECTED: 'rechazada',
  APROBADA: 'aprobada',
  APPROVED: 'aprobada',
};