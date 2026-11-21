import { render, screen } from "@testing-library/react";
import type { OcrAnalysis } from "@umsspira/shared-types";
import { OcrSummaryCard } from "./ocr-summary-card";

const analysis: OcrAnalysis = {
  id: "ocr-1",
  revision: 3,
  status: "COMPLETADO",
  current: true,
  createdAt: "2026-11-15T12:00:00.000Z",
  completedAt: "2026-11-15T12:05:00.000Z",
  error: null,
  result: {
    findings: [
      {
        field: "ci",
        label: "Cédula",
        declared: "1234567",
        read: "1234567",
        status: "COINCIDE",
        evidence: null,
        reason: "Los números coinciden.",
      },
    ],
    suggestion: "OBSERVAR",
    reason: "Hay un dato que requiere revisión.",
    reading: {
      lines: [],
      pagesRead: 1,
      totalPages: 1,
      partial: false,
      engine: "test",
      loadMs: 1,
      readMs: 1,
    },
    rulesVersion: "1",
  },
};

describe("OcrSummaryCard", () => {
  it("muestra la versión, fecha, sugerencia y comparación por dato", () => {
    render(<OcrSummaryCard analysis={analysis} />);

    expect(screen.getByText(/Versión 3 · Completado/)).toBeInTheDocument();
    expect(screen.getByText("Sugerencia: observar")).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /Cédula/ })).toHaveTextContent(
      "1234567",
    );
    expect(screen.getByText("Hay un dato que requiere revisión.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("distingue la carga de un expediente sin análisis", () => {
    render(<OcrSummaryCard analysis={null} loading />);

    expect(screen.getByText("Consultando análisis OCR…")).toBeInTheDocument();
    expect(
      screen.getByText("Se está consultando el resultado automático."),
    ).toBeInTheDocument();
  });
});
