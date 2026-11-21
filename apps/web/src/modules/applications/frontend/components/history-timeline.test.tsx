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
            action: "ENVIO",
            title: "Solicitud enviada",
            description: "Solicitud enviada para revisión.",
            actor: { type: "TITULADO", id: null },
            occurredAt: at,
          },
          {
            id: "send",
            version: 2,
            action: "ENVIO",
            title: "Solicitud corregida y reenviada",
            description: "Corrección reenviada para revisión.",
            actor: { type: "TITULADO", id: null },
            occurredAt: at,
          },
          {
            id: "ocr",
            version: 2,
            action: "OCR_ANALISIS",
            title: "Resultado del análisis OCR",
            description: "Sugerencia del OCR: OBSERVAR.",
            actor: { type: "SISTEMA", id: null },
            occurredAt: at,
          },
          {
            id: "review",
            version: 2,
            action: "DICTAMEN",
            title: "Dictamen del administrador",
            description: "Decisión administrativa: OBSERVADA.",
            actor: { type: "ADMINISTRADOR", id: null },
            occurredAt: at,
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
