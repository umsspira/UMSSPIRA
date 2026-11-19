"use client";
import type { OcrAnalysis } from "@umsspira/shared-types";

type OcrResult = NonNullable<OcrAnalysis["result"]>;
export type OcrFinding = OcrResult["findings"][number];

export const findingLabels: Record<OcrFinding["status"], string> = {
  COINCIDE: "Coincide",
  POSIBLE_DIFERENCIA: "Posible diferencia",
  NO_COMPROBADO: "No se pudo comprobar",
};

export function FindingsTable({
  findings,
  selectedField,
  onSelect,
}: {
  findings: OcrFinding[];
  selectedField: string | null;
  onSelect: (field: string) => void;
}) {
  return (
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
          {findings.map((finding) => {
            const selected = finding.field === selectedField;
            return (
              <tr
                key={finding.field}
                className={`border-b border-[#EEE9DF] align-top ${selected ? "bg-[#EEE9DF]" : ""}`}
              >
                <th scope="row" className="p-2">
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onSelect(finding.field)}
                    className="text-left font-semibold underline"
                  >
                    {finding.label}
                  </button>
                  <p className="mt-1 text-[10px] font-normal">
                    {finding.evidence
                      ? `Evidencia · pág. ${finding.evidence.page}`
                      : "Sin evidencia"}
                  </p>
                </th>
                <td className="p-2 break-words">
                  {finding.declared || "Sin dato"}
                </td>
                <td className="p-2 break-words">
                  {finding.read || "Sin dato comprobable"}
                </td>
                <td
                  className={`p-2 ${finding.status === "POSIBLE_DIFERENCIA" ? "text-[#A35139]" : ""}`}
                >
                  {findingLabels[finding.status]}
                  <p className="mt-1 text-[10px]">{finding.reason}</p>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}