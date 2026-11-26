"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, FileSearch, Info } from "lucide-react";
import type { OcrAnalysis } from "@umsspira/shared-types";
import { ocrRequest, ocrQueryErrorMessage } from "../services/ocr-api";
import { pollOcr } from "../services/ocr-polling";
import { prioritizeOcr } from "../services/ocr-control";
import { FindingsTable } from "./findings-table";
import { EvidenceViewer } from "./evidence-viewer";
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
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [retryError, setRetryError] = useState("");
  const [retrying, setRetrying] = useState(false);
  const lifecycle = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    lifecycle.current = controller;
    setAnalyses(null);
    setError("");
    setSelectedField(null);
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
  const needsReview =
    current?.status === "COMPLETADO" &&
    current.result &&
    current.result.suggestion !== "APROBAR";
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
    <details className="group/ocr rounded-xl border border-[#C9C1B1] bg-white p-4" open>
      <summary className="grid cursor-pointer list-none grid-cols-[auto_1fr_auto] items-center gap-x-2 gap-y-2 rounded-md text-[#1B2632] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 [&::-webkit-details-marker]:hidden lg:grid-cols-[auto_1fr_auto_auto]">
        <span className="rounded-lg bg-[#EEE9DF] p-2">
          <FileSearch aria-hidden="true" className="h-4 w-4" />
        </span>
        <span className="text-sm font-bold leading-tight sm:text-base">
          Análisis automático del respaldo (OCR)
        </span>
        <span
          className={`col-start-2 row-start-2 w-fit rounded-md px-2 py-1 text-[11px] font-semibold leading-tight lg:col-start-3 lg:row-start-1 ${needsReview ? "bg-[#F9DDCC] text-[#8C3B20]" : "bg-[#EEE9DF]"}`}
          role="status"
        >
          {current
            ? (needsReview ? "Revisar hallazgos" : states[current.status])
            : error
              ? "Consulta no disponible"
              : analyses === null
                ? "Consultando análisis…"
                : "Sin análisis vigente"}
        </span>
        <ChevronDown aria-hidden="true" className="col-start-3 row-start-1 h-4 w-4 text-[#4B5563] group-open/ocr:rotate-180 lg:col-start-4" />
      </summary>
      <p className="my-3 flex items-start gap-2 rounded-lg bg-[#F4F1EA] p-2.5 text-xs leading-5 text-[#2C3B4D]">
        <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
        <span>El OCR orienta la revisión. El administrador emite el dictamen.</span>
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
          {current.result.reading.pagesRead <
            current.result.reading.totalPages && (
            <p role="alert" className="mb-2 text-xs text-[#A35139]">
              Lectura incompleta. Puedes continuar con la revisión manual.
            </p>
          )}
          <FindingsTable
            findings={current.result.findings}
            selectedField={selectedField}
            onSelect={setSelectedField}
            renderDetails={(finding) => (
              <EvidenceViewer finding={finding} documentUrl={documentUrl} />
            )}
          />
          <details className="mt-3 rounded-lg bg-[#F4F1EA] p-2.5 text-xs text-[#2C3B4D]">
            <summary className="cursor-pointer rounded font-semibold text-[#1B2632]">
              Detalles del análisis
            </summary>
            <p className="mt-2 font-semibold">{suggestions[current.result.suggestion]}</p>
            <p className="mt-1">{current.result.reason}</p>
            <p className="mt-2">
              Versión {current.revision}
              {current.completedAt &&
                ` · ${new Date(current.completedAt).toLocaleString("es-BO", { timeZone: "America/La_Paz" })}`}
              {" · "}{current.result.reading.pagesRead}/{current.result.reading.totalPages} páginas
            </p>
          </details>
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
