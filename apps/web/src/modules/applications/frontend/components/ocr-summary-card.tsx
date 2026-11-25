import type { OcrFinding } from "@umsspira/shared-types";

const statuses: Record<string, string> = {
  PENDIENTE: "Pendiente",
  EN_CURSO: "En curso",
  COMPLETADO: "Completado",
  FALLIDO: "Revisión manual necesaria",
  DESCARTADO: "Versión anterior",
};

const suggestions: Record<string, string> = {
  APROBAR: "Sugerencia: aprobar",
  OBSERVAR: "Sugerencia: observar",
  RECHAZAR: "Sugerencia: rechazar",
  REVISION_MANUAL: "Revisión manual obligatoria",
};

const findings = {
  COINCIDE: "Coincide",
  POSIBLE_DIFERENCIA: "Posible diferencia",
  NO_COMPROBADO: "No se pudo comprobar",
};

type Props = {
  analysis: {
    revision: number;
    status: string;
    createdAt: string | null;
    completedAt: string | null;
    error: string | null;
    result: { suggestion: string; reason: string; findings: OcrFinding[] } | null;
  } | null;
  error?: string;
  loading?: boolean;
};

export function OcrSummaryCard({ analysis, error, loading = false }: Props) {
  const result = analysis?.result;
  const timestamp = analysis?.completedAt ?? analysis?.createdAt;

  return (
    <section
      aria-labelledby="ocr-summary-title"
      className="rounded-lg border border-[#C9C1B1] bg-white p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 id="ocr-summary-title" className="text-sm font-bold text-[#1B2632]">
            Resultado automático más reciente
          </h3>
          <p className="mt-1 text-xs text-[#2C3B4D]">
            {analysis
              ? `Versión ${analysis.revision} · ${statuses[analysis.status]}`
              : error
                ? "Consulta no disponible"
                : loading
                  ? "Consultando análisis OCR…"
                  : "Sin análisis registrado"}
            {timestamp &&
              ` · ${new Date(timestamp).toLocaleString("es-BO", {
                timeZone: "America/La_Paz",
              })}`}
          </p>
        </div>
        {result && (
          <span className="rounded bg-[#EEE9DF] px-2 py-1 text-xs font-semibold text-[#1B2632]">
            {suggestions[result.suggestion]}
          </span>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-[#A35139]">
          {error}
        </p>
      )}
      {analysis?.error && (
        <p role="alert" className="mt-3 text-sm text-[#A35139]">
          {analysis.error}
        </p>
      )}
      {result ? (
        <>
          <p className="my-3 text-sm text-[#2C3B4D]">{result.reason}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <caption className="sr-only">
                Comparación del OCR por dato declarado
              </caption>
              <thead className="bg-[#EEE9DF]">
                <tr>
                  {["Dato", "Declarado", "Leído", "Comparación"].map((label) => (
                    <th key={label} scope="col" className="p-2">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.findings.map((finding) => (
                  <tr
                    key={finding.field}
                    className="border-b border-[#EEE9DF] align-top"
                  >
                    <th scope="row" className="p-2">
                      {finding.label}
                    </th>
                    <td className="break-words p-2">
                      {finding.declared || "Sin dato"}
                    </td>
                    <td className="break-words p-2">
                      {finding.read || "No legible"}
                    </td>
                    <td
                      className={`p-2 ${
                        finding.status === "POSIBLE_DIFERENCIA"
                          ? "text-[#A35139]"
                          : "text-[#2C3B4D]"
                      }`}
                    >
                      {findings[finding.status]}
                      <p className="mt-1">{finding.reason}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        !error && !analysis?.error && (
          <p className="mt-3 text-sm text-[#2C3B4D]">
            {analysis
              ? "El análisis todavía no tiene un resultado disponible."
              : loading
                ? "Se está consultando el resultado automático."
                : "El expediente aún no tiene resultados OCR."}
          </p>
        )
      )}
      <p className="mt-3 text-xs text-[#2C3B4D]">
        El OCR es una sugerencia automática; la decisión corresponde al administrador.
      </p>
    </section>
  );
}
