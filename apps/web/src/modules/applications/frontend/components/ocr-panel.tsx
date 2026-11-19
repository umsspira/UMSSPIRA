"use client";
import { useEffect, useRef, useState } from "react";
import type { OcrAnalysis } from "@umsspira/shared-types";
import { ocrRequest, ocrQueryErrorMessage } from "../services/ocr-api";
import { pollOcr } from "../services/ocr-polling";
import { prioritizeOcr } from "../services/ocr-control";
const states = {
  PENDIENTE: "Pendiente",
  EN_CURSO: "En curso",
  COMPLETADO: "Lectura completada",
  FALLIDO: "Falló el procesamiento",
  DESCARTADO: "Procesamiento detenido",
};
const suggestions = {
  APROBAR: "Sugerencia: aprobar",
  OBSERVAR: "Sugerencia: observar",
  RECHAZAR: "Sugerencia: rechazar",
  REVISION_MANUAL: "Lectura completada: requiere revisión manual",
};
const findings = {
  COINCIDE: "Coincide",
  POSIBLE_DIFERENCIA: "Posible diferencia",
  NO_COMPROBADO: "No se pudo comprobar",
};
export function OcrPanel({
  applicationId,
  documentUrl,
  canRetry = false,
}: {
  applicationId: string;
  documentUrl: string;
  canRetry?: boolean;
}) {
  const [analyses, setAnalyses] = useState<OcrAnalysis[] | null>(null);
  const [error, setError] = useState("");
  const [retryError, setRetryError] = useState("");
  const [retrying, setRetrying] = useState(false);
  const lifecycle = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    lifecycle.current = controller;
    setAnalyses(null);
    setError("");
    setRetryError("");
    setRetrying(false);
    prioritizeOcr(applicationId);
    let pending = true;
    const load = async () => {
      return ocrRequest<OcrAnalysis[]>(
        `${applicationId}/ocr`,
        undefined,
        controller.signal,
      )
        .then((data) => {
          if (!controller.signal.aborted) {
            setAnalyses(data);
            setError("");
            const current = data.find((item) => item.current);
            pending =
              !current || ["PENDIENTE", "EN_CURSO"].includes(current.status);
          }
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted) setError(ocrQueryErrorMessage(error));
          throw error;
        });
    };
    const stop = pollOcr(load, controller.signal, () =>
      pending ? 3000 : 30000,
    );
    return () => {
      controller.abort();
      stop();
    };
  }, [applicationId]);
  const current = analyses?.find((item) => item.current);
  const retry = async () => {
    if (!current || retrying || !canRetry || error) return;
    const signal = lifecycle.current?.signal;
    setRetrying(true);
    setRetryError("");
    try {
      await ocrRequest(`ocr/${current.id}/retry`, {}, signal);
      if (signal?.aborted) return;
      setAnalyses(
        (rows) =>
          rows?.map((row) =>
            row.id === current.id
              ? { ...row, status: "PENDIENTE", error: null, completedAt: null }
              : row,
          ) ?? null,
      );
      prioritizeOcr(applicationId);
      window.dispatchEvent(new Event("umsspira:ocr-updated"));
    } catch (failure) {
      if (!signal?.aborted) setRetryError(ocrQueryErrorMessage(failure));
      window.dispatchEvent(new Event("umsspira:ocr-updated"));
    } finally {
      if (!signal?.aborted) setRetrying(false);
    }
  };
  return (
    <details className="rounded-lg border border-[#C9C1B1] bg-white p-4" open>
      <summary className="cursor-pointer text-sm font-bold text-[#1B2632]">
        Análisis automático del respaldo (OCR)
        <span
          className="ml-2 inline-block rounded bg-[#EEE9DF] px-2 py-1 text-xs"
          role="status"
        >
          {current
            ? states[current.status]
            : error
              ? "Consulta no disponible"
              : analyses === null
                ? "Consultando análisis…"
                : "Sin análisis vigente"}
        </span>
      </summary>
      <p className="my-3 text-xs text-[#2C3B4D]">
        El análisis ayuda a la revisión. La decisión corresponde al
        administrador y no se confirma automáticamente.
      </p>
      {error && (
        <div role="alert" className="my-3 text-sm text-[#A35139]">
          <p>{error}</p>
          <p>
            {current
              ? "Se conserva el último estado consultado."
              : "Todavía no se pudo comprobar el estado del OCR."}
          </p>
          <button
            type="button"
            className="mt-2 underline font-semibold"
            onClick={() =>
              window.dispatchEvent(new Event("umsspira:ocr-updated"))
            }
          >
            Volver a consultar
          </button>
        </div>
      )}
      {current?.status === "PENDIENTE" && (
        <p className="my-3 text-sm">
          El análisis está en espera. Mantén la bandeja abierta y visible;
          empezará automáticamente cuando tenga turno.
        </p>
      )}
      {current?.status === "EN_CURSO" && (
        <p className="my-3 text-sm">
          El respaldo se está procesando en esta u otra sesión administradora.
          El resultado aparecerá aquí al terminar.
        </p>
      )}
      {current?.status === "DESCARTADO" && (
        <p className="my-3 text-sm">
          Este análisis ya no se ejecutará porque la solicitud fue resuelta o el
          respaldo dejó de estar vigente.
        </p>
      )}
      {current?.status === "FALLIDO" && (
        <div className="my-3 text-sm">
          <p className="font-semibold text-[#A35139]">
            El procesamiento no terminó y no se guardó un resultado OCR.
          </p>
          {current.completedAt && (
            <p className="mt-1 text-xs">
              Último fallo:{" "}
              {new Date(current.completedAt).toLocaleString("es-BO", {
                timeZone: "America/La_Paz",
              })}
              .
            </p>
          )}
          <p className="mt-2">
            Puedes revisar el respaldo manualmente
            {canRetry ? " o volver a intentar el análisis." : "."}
          </p>
          {current.error && (
            <details className="mt-2">
              <summary className="cursor-pointer underline">
                Detalle del fallo
              </summary>
              <p className="mt-1">{current.error}</p>
            </details>
          )}
          {canRetry && (
            <button
              type="button"
              disabled={retrying || Boolean(error)}
              onClick={() => void retry()}
              className="mt-3 rounded border border-[#C9C1B1] px-3 py-2 font-semibold disabled:opacity-50"
            >
              {retrying ? "Preparando nuevo intento…" : "Reintentar análisis"}
            </button>
          )}
          {retryError && (
            <p role="alert" className="mt-2 text-[#A35139]">
              {retryError}
            </p>
          )}
        </div>
      )}
      {current?.result && (
        <>
          <p className="font-semibold text-[#1B2632]">
            {suggestions[current.result.suggestion]}
          </p>
          {current.result.suggestion === "REVISION_MANUAL" && (
            <p className="my-2 text-sm">
              La lectura terminó. Revisa el respaldo para comprobar los datos
              que no se pudieron verificar automáticamente.
            </p>
          )}
          <p className="my-2 text-sm">{current.result.reason}</p>
          <p className="mb-3 text-xs">
            Versión {current.revision} ·{" "}
            {current.completedAt &&
              new Date(current.completedAt).toLocaleString("es-BO", {
                timeZone: "America/La_Paz",
              })}{" "}
            · {current.result.reading.pagesRead}/
            {current.result.reading.totalPages} páginas
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <caption className="sr-only">
                Comparación entre registro y respaldo
              </caption>
              <thead className="bg-[#EEE9DF]">
                <tr>
                  {["Campo", "Declarado", "Leído", "Resultado"].map((title) => (
                    <th key={title} scope="col" className="p-2">
                      {title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {current.result.findings.map((finding) => (
                  <tr
                    key={finding.field}
                    className="border-b border-[#EEE9DF] align-top"
                  >
                    <th scope="row" className="p-2">
                      {finding.label}
                    </th>
                    <td className="p-2 break-words">
                      {finding.declared || "Sin dato"}
                    </td>
                    <td className="p-2 break-words">
                      {finding.read || "Sin dato comprobable"}
                      {finding.evidence && (
                        <details className="mt-2">
                          <summary className="cursor-pointer underline">
                            Evidencia · pág. {finding.evidence.page}
                          </summary>
                          <p className="my-1">{finding.evidence.text}</p>
                          {documentUrl && (
                            <a
                              className="underline"
                              href={`${documentUrl.split("#")[0]}#page=${finding.evidence.page}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Abrir página del respaldo
                            </a>
                          )}
                        </details>
                      )}
                    </td>
                    <td
                      className={`p-2 ${finding.status === "POSIBLE_DIFERENCIA" ? "text-[#A35139]" : ""}`}
                    >
                      {findings[finding.status]}
                      <p className="mt-1 text-[10px]">{finding.reason}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {analyses?.some((item) => !item.current) && (
        <details className="mt-3 text-xs">
          <summary className="cursor-pointer">Análisis anteriores</summary>
          {analyses
            .filter((item) => !item.current)
            .map((item) => (
              <p key={item.id} className="mt-2">
                Antecedente · versión {item.revision}:{" "}
                {item.result
                  ? suggestions[item.result.suggestion]
                  : states[item.status]}{" "}
                {item.completedAt &&
                  `· ${new Date(item.completedAt).toLocaleString("es-BO", { timeZone: "America/La_Paz" })}`}
              </p>
            ))}
        </details>
      )}
    </details>
  );
}
