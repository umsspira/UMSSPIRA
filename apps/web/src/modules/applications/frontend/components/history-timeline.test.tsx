import { render, screen } from "@testing-library/react";
import { HistoryTimeline } from "./history-timeline";

const at = "2026-11-15T12:00:00.000Z";

describe("HistoryTimeline", () => {
  it("distingue reenvíos, sugerencias OCR y decisiones con actor y versión", () => {
    render(
      <HistoryTimeline
        events={[
          {
            id: "initial",
            version: 1,
            actorType: "TITULADO",
            action: "ENVIO",
            detail: "Solicitud enviada para revisión.",
            createdAt: at,
          },
          {
            id: "send",
            version: 2,
            actorType: "TITULADO",
            action: "ENVIO",
            detail: "Corrección reenviada para revisión.",
            createdAt: at,
          },
          {
            id: "ocr",
            version: 2,
            actorType: "SISTEMA",
            action: "OCR_ANALISIS",
            detail: "Sugerencia del OCR: OBSERVAR.",
            createdAt: at,
          },
          {
            id: "review",
            version: 2,
            actorType: "ADMINISTRADOR",
            action: "DICTAMEN",
            detail: "Decisión administrativa: OBSERVADA.",
            createdAt: at,
          },
        ]}
      />,
    );

    expect(screen.getByText("Envío inicial")).toBeInTheDocument();
    expect(screen.getByText("Reenvío")).toBeInTheDocument();
    expect(screen.getByText("Sugerencia del OCR")).toBeInTheDocument();
    expect(screen.getByText("Decisión del administrador")).toBeInTheDocument();
    expect(screen.getByText(/Versión 2 · Titulado/)).toBeInTheDocument();
    expect(screen.getByText(/Versión 2 · Sistema/)).toBeInTheDocument();
    expect(screen.getByText(/Versión 2 · Administrador/)).toBeInTheDocument();
    expect(screen.getAllByRole("time")).toHaveLength(4);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
