import {
  authenticatedFetch,
  SessionError,
} from "@/shared/services/auth-session";
import { withOcrDeadline } from "./ocr-control";
import { OcrTimeoutError } from "./ocr-errors";
export class OcrHttpError extends Error {
  constructor(public readonly status: number) {
    super(
      status === 409
        ? "La reserva cambió. Otro navegador continuará el análisis."
        : `No se pudo consultar el análisis automático (HTTP ${status}). Puedes revisar manualmente.`,
    );
  }
}

export function ocrQueryErrorMessage(error: unknown): string {
  const status =
    error instanceof OcrHttpError || error instanceof SessionError
      ? error.status
      : undefined;
  if (status === 401)
    return "Tu sesión venció. Inicia sesión de nuevo para consultar el análisis.";
  if (status === 403)
    return "No tienes permiso para consultar el análisis de esta solicitud.";
  if (status === 404)
    return "La solicitud o el análisis ya no están disponibles. Vuelve a la bandeja.";
  if (status === 409)
    return "El análisis cambió de estado. Vuelve a consultar el expediente.";
  if (status === 429)
    return "Hay demasiadas consultas. Espera unos segundos y vuelve a intentarlo.";
  if (status && status >= 500)
    return `El servidor no pudo responder a la consulta (HTTP ${status}). Se volverá a intentar.`;
  if (error instanceof OcrTimeoutError)
    return "La consulta tardó demasiado. Se volverá a intentar.";
  if (error instanceof TypeError)
    return "No hay conexión con el servidor. Se volverá a intentar la consulta.";
  return "No se pudo consultar el estado del análisis. Se volverá a intentar.";
}
export async function ocrRequest<T>(
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  return withOcrDeadline(async (bounded) => {
    const response = await authenticatedFetch(`/api/v1/applications/${path}`, {
      method: body === undefined ? "GET" : "POST",
      cache: "no-store",
      signal: bounded,
      ...(body === undefined
        ? {}
        : {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }),
    });
    if (!response.ok) throw new OcrHttpError(response.status);
    return (await response.json()).data as T;
  }, signal);
}
