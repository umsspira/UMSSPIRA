"use client";
import { Fragment, useId, type ReactNode } from "react";
import { CheckCircle2, ChevronRight, CircleHelp, TriangleAlert } from "lucide-react";
import type { OcrAnalysis } from "@umsspira/shared-types";

type OcrResult = NonNullable<OcrAnalysis["result"]>;
export type OcrFinding = OcrResult["findings"][number];

const findingLabels: Record<OcrFinding["status"], string> = {
  COINCIDE: "Coincide",
  POSIBLE_DIFERENCIA: "Posible diferencia",
  NO_COMPROBADO: "No comprobable",
};

const resultStyles = {
  COINCIDE: { icon: CheckCircle2, badge: "bg-[#ECE9E2] text-[#1B2632]" },
  POSIBLE_DIFERENCIA: { icon: TriangleAlert, badge: "bg-[#F9DDCC] text-[#8C3B20]" },
  NO_COMPROBADO: { icon: CircleHelp, badge: "bg-[#ECE9E2] text-[#4B5563]" },
};

export function FindingsTable({
  findings,
  selectedField,
  onSelect,
  renderDetails,
}: {
  findings: OcrFinding[];
  selectedField: string | null;
  onSelect: (field: string | null) => void;
  renderDetails: (finding: OcrFinding) => ReactNode;
}) {
  const detailsId = useId();

  return (
    <div className="overflow-x-auto rounded-xl bg-[#F4F1EA] p-1.5">
      <table className="w-full table-fixed border-separate border-spacing-y-1 text-left text-xs leading-4 text-[#1B2632]">
        <caption className="sr-only">
          Comparación entre registro y respaldo. Selecciona un campo para ver su detalle.
        </caption>
        <thead className="text-[10px] font-semibold uppercase tracking-wide text-[#4B5563]">
          <tr>
            <th scope="col" className="w-[27%] p-1.5 sm:w-[23%] sm:p-2">Campo</th>
            <th scope="col" className="w-[23%] p-1.5 sm:w-[24%] sm:p-2">Declarado</th>
            <th scope="col" className="w-[25%] p-1.5 sm:w-[27%] sm:p-2">Documento (OCR)</th>
            <th scope="col" className="p-1.5 text-right sm:p-2">Resultado</th>
          </tr>
        </thead>
        <tbody>
          {findings.map((finding) => {
            const selected = finding.field === selectedField;
            const difference = finding.status === "POSIBLE_DIFERENCIA";
            const { icon: ResultIcon, badge } = resultStyles[finding.status];

            return (
              <Fragment key={finding.field}>
                <tr className={difference || selected ? "bg-[#F0E8DC]" : "bg-white"}>
                  <th scope="row" className="rounded-l-lg p-1.5 sm:p-2">
                    <button
                      type="button"
                      aria-expanded={selected}
                      aria-controls={selected ? detailsId : undefined}
                      onClick={() => onSelect(selected ? null : finding.field)}
                      className={`flex w-full items-center gap-0.5 rounded text-left font-semibold hover:underline ${difference ? "text-[#8C3B20]" : ""}`}
                    >
                      <ChevronRight
                        aria-hidden="true"
                        className={`h-3 w-3 shrink-0 ${selected ? "rotate-90" : ""}`}
                      />
                      <span className="min-w-0 break-words">{finding.label}</span>
                    </button>
                  </th>
                  <td className="break-words p-1.5 sm:p-2">
                    {finding.declared || "Sin dato"}
                  </td>
                  <td className={`break-words p-1.5 font-mono sm:p-2 ${difference ? "text-[#8C3B20]" : ""}`}>
                    {finding.read || <span className="font-sans italic text-[#4B5563]">Sin lectura</span>}
                  </td>
                  <td className="rounded-r-lg p-1.5 text-right sm:p-2">
                    <span className={`inline-flex max-w-full items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-semibold leading-tight ${badge}`}>
                      <ResultIcon aria-hidden="true" className="hidden h-3 w-3 shrink-0 sm:block" />
                      <span className="min-w-0 break-words">{findingLabels[finding.status]}</span>
                    </span>
                  </td>
                </tr>
                {selected && (
                  <tr>
                    <td colSpan={4} id={detailsId} className="rounded-lg bg-white px-3 py-2.5">
                      {renderDetails(finding)}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
