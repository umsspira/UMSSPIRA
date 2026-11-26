"use client";
import type { OcrFinding } from "./findings-table";

export function EvidenceViewer({
  finding,
  documentUrl,
}: {
  finding: OcrFinding;
  documentUrl: string;
}) {
  return (
    <section
      aria-label={`Detalle de ${finding.label}`}
      className="space-y-2 text-xs text-[#2C3B4D]"
    >
      <p className="break-words font-medium">{finding.reason}</p>
      {finding.evidence ? (
        <div>
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
        <p>
          No hay evidencia disponible para este campo. Puedes comprobarlo
          manualmente en el documento.
        </p>
      )}
    </section>
  );
}
