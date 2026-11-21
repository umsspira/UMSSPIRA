/**
 * HU-14 · Estados de vacante en el frontend (un solo lugar).
 *
 * El backend guarda PUBLICADO | PAUSADO | CERRADO (ver job-posting-status.policy.ts) y
 * todavía puede devolver alias viejos hasta que se aplique la migración. Aquí se traducen
 * al código de UI y al texto único que se muestra en todas las pantallas.
 */
export type VacancyUiStatus = "ACTIVA" | "PAUSADA" | "CERRADA" | "BORRADOR";

/** Texto único para badges, filtros y detalles ("Activa", "Pausada", "Cerrada", "Borrador"). */
export const VACANCY_STATUS_LABEL: Record<VacancyUiStatus, string> = {
  ACTIVA: "Activa",
  PAUSADA: "Pausada",
  CERRADA: "Cerrada",
  BORRADOR: "Borrador",
};

/** Valores que el backend acepta para cambiar el estado (PATCH /vacantes/:id). */
export const VACANCY_API_STATUS = {
  PAUSE: "PAUSADO",
  RESUME: "PUBLICADO",
} as const;

const ACTIVE = ["PUBLICADO", "PUBLICADA", "ACTIVA", "ACTIVO", "ACTIVE", "PUBLISHED"];
const PAUSED = ["PAUSADO", "PAUSADA", "PAUSED"];
const CLOSED = ["CERRADO", "CERRADA", "CLOSED"];

export function normalizeVacancyStatus(raw: unknown): VacancyUiStatus {
  const estado = String(raw ?? "").toUpperCase().trim();
  if (ACTIVE.includes(estado)) return "ACTIVA";
  if (PAUSED.includes(estado)) return "PAUSADA";
  if (CLOSED.includes(estado)) return "CERRADA";
  return "BORRADOR";
}

export type VacancyLifecycleAction = "pausar" | "reanudar" | "cerrar" | "eliminar";

/** Mensaje claro según el código HTTP que devolvió el backend. */
export function vacancyLifecycleErrorMessage(status: number, action: VacancyLifecycleAction): string {
  if (status === 403) return "No tienes permiso para realizar esta acción.";
  if (status === 404) return "No encontramos esa vacante en tu empresa.";
  if (status === 409) {
    return action === "eliminar"
      ? "No se puede eliminar una vacante con postulantes. Ciérrala en su lugar."
      : "La vacante ya no admite este cambio de estado.";
  }
  return `No se pudo ${action} la vacante. Inténtalo de nuevo.`;
}