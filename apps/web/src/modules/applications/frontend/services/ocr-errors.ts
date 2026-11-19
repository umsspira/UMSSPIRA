import type { OcrFailure } from "@umsspira/shared-types";

const stages: Record<OcrFailure["stage"], string> = {
  document: "descargar el respaldo",
  engine: "cargar el motor OCR",
  read: "leer el documento",
  complete: "guardar el resultado",
  renew: "renovar la reserva",
};

export class OcrTimeoutError extends Error {}
export class OcrInterruptedError extends Error {}

export class OcrFailureError extends Error {
  constructor(public readonly failure: OcrFailure) {
    const detail = failure.status
      ? ` (HTTP ${failure.status})`
      : failure.code === "TIMEOUT"
        ? " (tiempo de espera agotado)"
        : failure.code === "NETWORK_ERROR"
          ? " (sin conexión)"
          : "";
    super(
      `No se pudo ${stages[failure.stage]}${detail}. Se permite la revisión manual.`,
    );
  }
}

// Do not send arbitrary exception messages: SDK errors can include document text or URLs.
export function ocrFailure(
  error: unknown,
  stage: OcrFailure["stage"],
): OcrFailureError {
  if (error instanceof OcrFailureError) return error;
  const status = (error as { status?: unknown } | null)?.status;
  return new OcrFailureError({
    stage,
    code:
      error instanceof OcrTimeoutError
        ? "TIMEOUT"
        : typeof status === "number"
          ? "HTTP_ERROR"
          : error instanceof TypeError
            ? "NETWORK_ERROR"
            : "PROCESSING_ERROR",
    ...(typeof status === "number" && status >= 400 && status <= 599
      ? { status }
      : {}),
  });
}
