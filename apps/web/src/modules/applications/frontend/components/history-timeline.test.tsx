import { render, screen, within } from "@testing-library/react";
import { HistoryTimeline, historyEventTone } from "./history-timeline";

const at = "2026-11-15T12:00:00.000Z";

describe("HistoryTimeline", () => {
  it.each([
    ["APROBADA", "approved"],
    ["RECHAZADA", "rejected"],
    ["OBSERVADA", "observed"],
  ])("distingue el punto de un dictamen %s", (decision, tone) => {
    expect(
      historyEventTone({
        id: "e",
        version: 1,
        action: "DICTAMEN",
        title: "Dictamen del administrador",
        description: `Decisión administrativa: ${decision}.`,
        actor: { type: "ADMINISTRADOR", id: null },
        occurredAt: at,
      }),
    ).toBe(tone);
  });

  it("no confunde una sugerencia OCR ni una nota libre con una aprobación", () => {
    const event = {
      id: "e",
      version: 1,
      action: "OCR_ANALISIS",
      title: "Resultado OCR",
      description: "Decisión: APROBADA",
      actor: { type: "SISTEMA", id: null },
      occurredAt: at,
    };
    expect(historyEventTone(event)).toBe("ocr");
    expect(
      historyEventTone({
        ...event,
        action: "DICTAMEN",
        description: "La anterior solicitud fue aprobada.",
      }),
    ).toBe("review");
  });
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

  it("muestra el autor real y ordena los movimientos recientes primero sin alterar los datos", () => {
    const events = [
      {
        id: "initial",
        version: 1,
        action: "ENVIO",
        title: "Solicitud recibida",
        description: null,
        actor: { type: "TITULADO", id: "titulado-1" },
        occurredAt: "2026-11-20T12:00:00Z",
      },
      {
        id: "decision",
        version: 1,
        action: "DICTAMEN",
        title: "Solicitud aprobada",
        description: "Decisión: APROBADA",
        actor: {
          type: "ADMINISTRADOR",
          id: "admin-1",
          name: "Ana Administradora",
          email: "ana@example.test",
        },
        occurredAt: "2026-11-20T13:00:00Z",
      },
    ];
    render(<HistoryTimeline events={events} />);
    const items = within(
      screen.getByRole("list", { name: "Acciones del expediente" }),
    ).getAllByRole("listitem");
    expect(within(items[0]).getByText("Solicitud aprobada")).toBeVisible();
    expect(within(items[0]).getByText("Ana Administradora")).toBeVisible();
    expect(within(items[0]).getByText("ana@example.test")).toBeVisible();
    expect(within(items[0]).getByRole("time")).toHaveAttribute(
      "dateTime",
      "2026-11-20T13:00:00Z",
    );
    expect(screen.getByText("2 movimientos registrados")).toBeVisible();
    expect(events[0].id).toBe("initial");
  });

  it("no inventa un nombre cuando el registro solo conserva el ID del administrador", () => {
    render(
      <HistoryTimeline
        events={[
          {
            id: "decision",
            version: 1,
            action: "DICTAMEN",
            title: "Dictamen",
            description: null,
            actor: { type: "ADMINISTRADOR", id: "admin-anterior" },
            occurredAt: at,
          },
        ]}
      />,
    );
    expect(screen.getByText("ID admin-anterior")).toBeVisible();
  });
});
