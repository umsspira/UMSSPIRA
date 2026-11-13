import { authenticatedFetch } from "@/shared/services/auth-session";
export async function ocrRequest<T>(
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await authenticatedFetch(`/api/v1/applications/${path}`, {
    method: body === undefined ? "GET" : "POST",
    cache: "no-store",
    signal,
    ...(body === undefined
      ? {}
      : {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
  });
  if (!response.ok)
    throw new Error(
      response.status === 409
        ? "La reserva cambió. Otro navegador continuará el análisis."
        : "No se pudo consultar el análisis automático. Puedes revisar manualmente.",
    );
  return (await response.json()).data as T;
}
