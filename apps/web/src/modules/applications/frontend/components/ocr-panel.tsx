"use client";
import { useEffect, useState } from "react";
import type { OcrAnalysis } from "@umsspira/shared-types";
import { ocrRequest } from "../services/ocr-api";
import { pollOcr } from "../services/ocr-polling";
import { prioritizeOcr } from "../services/ocr-control";
import { FindingsTable } from "./findings-table";
import { EvidenceViewer } from "./evidence-viewer";
const states = {
  PENDIENTE: "Pendiente",
  EN_CURSO: "En curso",
  COMPLETADO: "Completado",
  FALLIDO: "Revisión manual necesaria",
  DESCARTADO: "Versión anterior",
};
const suggestions = {
  APROBAR: "Sugerencia: aprobar",
  OBSERVAR: "Sugerencia: observar",
  RECHAZAR: "Sugerencia: rechazar",
  REVISION_MANUAL: "Revisión manual obligatoria",
};
export function OcrPanel({
  applicationId,
  documentUrl,
}: {
  applicationId: string;
  documentUrl: string;
}) {
  const [analyses, setAnalyses] = useState<OcrAnalysis[]>([]);
  const [error, setError] = useState("");
  const [selectedField, setSelectedField] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setAnalyses([]);
    setError("");
    setSelectedField(null);
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
            const current = data.find(item => item.current);
            pending = !current || ["PENDIENTE", "EN_CURSO"].includes(current.status);
          }
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted)
            setError(
              "No se pudo consultar el análisis. Puedes continuar con la revisión manual.",
            );
          throw error;
        });
    };
    const stop = pollOcr(load, controller.signal, () => pending ? 3000 : 30000);
    return () => {
      controller.abort();
      stop();
    };
  }, [applicationId]);
  const current = analyses.find((item) => item.current);
  return (
    <details className="rounded-lg border border-[#C9C1B1] bg-white p-4" open>
      <summary className="cursor-pointer text-sm font-bold text-[#1B2632]">
        Análisis automático del respaldo (OCR)
        <span
          className="ml-2 inline-block rounded bg-[#EEE9DF] px-2 py-1 text-xs"
          role="status"
        >
          {error
            ? "Análisis no disponible"
            : current
              ? states[current.status]
              : "Sin análisis vigente"}
        </span>
      </summary>
      <p className="my-3 text-xs text-[#2C3B4D]">
        El análisis ayuda a la revisión. La decisión corresponde al
        administrador y no se confirma automáticamente.
      </p>
      {error && (
        <p role="alert" className="text-sm text-[#A35139]">
          {error}
        </p>
      )}
      {current?.error && (
        <p className="text-sm text-[#A35139]">{current.error}</p>
      )}
      {current?.result && (
        <>
          <p className="font-semibold text-[#1B2632]">
            {suggestions[current.result.suggestion]}
          </p>
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
      {analyses.some((item) => !item.current) && (
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