"use client";
import { useEffect, useRef, useState } from "react";
import type { OcrAnalysis } from "@umsspira/shared-types";
import { ocrRequest, ocrQueryErrorMessage } from "../services/ocr-api";
import { pollOcr } from "../services/ocr-polling";
import { prioritizeOcr } from "../services/ocr-control";
import { FindingsTable } from "./findings-table";
import { EvidenceViewer } from "./evidence-viewer";
import { FileSearch, Info, ChevronDown } from "lucide-react";
import styles from "./ocr-review.module.css";
import { OcrCompatibility } from "./ocr-compatibility";
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
    <details className={styles.panel} open>
      <summary className={styles.heading}>
        <span className={styles.icon}>
          <FileSearch size={24} aria-hidden="true" />
        </span>
        <span className={styles.title}>
          Análisis automático del respaldo (OCR)
        </span>
        <span
          className={`${styles.status} ${current?.result?.findings.some((finding) => finding.status !== "COINCIDE") ? styles.attention : ""}`}
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
        <ChevronDown size={18} aria-hidden="true" className={styles.chevron} />
      </summary>
      <div className={styles.content}>
        <p className={styles.notice}>
          <Info size={16} aria-hidden="true" />
          <span>
            El OCR ayuda a comparar los datos.{" "}
            <strong>El dictamen corresponde al administrador.</strong>
          </span>
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
          />
          <EvidenceViewer
            finding={
              current.result.findings.find((f) => f.field === selectedField) ??
              null
            }
            documentUrl={documentUrl}
          />
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
      </div>
    </details>
  );
}