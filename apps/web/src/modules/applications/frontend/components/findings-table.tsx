"use client";
import type { OcrAnalysis } from "@umsspira/shared-types";
import {
  CheckCircle2,
  TriangleAlert,
  CircleHelp,
  ChevronRight,
} from "lucide-react";
import styles from "./ocr-review.module.css";

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
    <div className={styles.tableFrame}>
      <table className={styles.table}>
        <caption className="sr-only">
          Comparación entre registro y respaldo
        </caption>
        <thead>
          <tr>
            {[
              "Campo verificado",
              "Declarado",
              "Documento (OCR)",
              "Resultado",
            ].map((title) => (
              <th key={title} scope="col">
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
                data-status={finding.status}
                data-selected={selected}
              >
                <th scope="row">
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onSelect(finding.field)}
                    className={styles.fieldButton}
                  >
                    {finding.label}
                    <ChevronRight size={12} aria-hidden="true" />
                  </button>
                </th>
                <td>{finding.declared || "Sin dato"}</td>
                <td
                  className={`${styles.read} ${!finding.read ? styles.unread : ""}`}
                >
                  {finding.read || "No legible"}
                </td>
                <td>
                  <span
                    className={styles.badge}
                    data-status={finding.status}
                    title={finding.reason}
                  >
                    {finding.status === "COINCIDE" ? (
                      <CheckCircle2 size={13} aria-hidden="true" />
                    ) : finding.status === "POSIBLE_DIFERENCIA" ? (
                      <TriangleAlert size={13} aria-hidden="true" />
                    ) : (
                      <CircleHelp size={13} aria-hidden="true" />
                    )}
                    {finding.status === "NO_COMPROBADO"
                      ? "No comprobable"
                      : findingLabels[finding.status]}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
