import { authenticatedFetch } from "@/shared/services/auth-session";
import { withOcrDeadline } from "./ocr-control";
export class OcrHttpError extends Error {
  constructor(public readonly status: number) {
    super(
      status === 409
        ? "La reserva cambió. Otro navegador continuará el análisis."
        : `No se pudo consultar el análisis automático (HTTP ${status}). Puedes revisar manualmente.`,
    );
  }
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
