"use client";
import { findingLabels, type OcrFinding } from "./findings-table";

export function EvidenceViewer({
  finding,
  documentUrl,
}: {
  finding: OcrFinding | null;
  documentUrl: string;
}) {
  if (!finding) {
    return (
      <p className="mt-3 rounded-lg border border-dashed border-[#C9C1B1] p-3 text-xs text-[#2C3B4D]">
        Selecciona un hallazgo para ver su evidencia.
      </p>
    );
  }
  return (
    <section
      aria-label={`Evidencia de ${finding.label}`}
      className="mt-3 rounded-lg border border-[#C9C1B1] bg-[#EEE9DF] p-3 text-xs"
    >
      <h4 className="mb-2 font-bold text-[#1B2632]">{finding.label}</h4>
      <dl className="grid gap-2 sm:grid-cols-2">
        <div>
          <dt className="font-medium uppercase text-[#2C3B4D]">Declarado</dt>
          <dd className="break-words font-semibold">
            {finding.declared || "Sin dato"}
          </dd>
        </div>
        <div>
          <dt className="font-medium uppercase text-[#2C3B4D]">Leído</dt>
          <dd className="break-words font-semibold">
            {finding.read || "No legible"}
          </dd>
        </div>
      </dl>
      <p
        className={`mt-2 ${finding.status === "POSIBLE_DIFERENCIA" ? "text-[#A35139]" : ""}`}
      >
        {findingLabels[finding.status]} · {finding.reason}
      </p>
      {finding.evidence ? (
        <div className="mt-2">
          <p className="font-medium">Evidencia · pág. {finding.evidence.page}</p>
          <blockquote className="my-1 break-words border-l-2 border-[#C9C1B1] pl-2">
            {finding.evidence.text}
          </blockquote>
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
        </div>
      ) : (
        <p className="mt-2">
          No hay evidencia disponible para este campo. Puedes comprobarlo
          manualmente en el documento.
        </p>
      )}
    </section>
  );
}