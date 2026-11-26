import "@testing-library/jest-dom";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ocrRequest } from "../services/ocr-api";
import { retryMailEvent } from "../services/applications-board.service";
import { ReviewControls, buildPayload, validateDraft, emptyDraft } from "./review-controls";

jest.mock("@/shared/services/auth-session", () => ({
  authenticatedFetch: jest.fn(),
  SessionError: class SessionError extends Error {},
}));
jest.mock("../services/ocr-api", () => ({ ocrRequest: jest.fn() }));
jest.mock("../services/applications-board.service", () => ({ retryMailEvent: jest.fn() }));

const ocrMock = ocrRequest as jest.Mock;
const retryMock = retryMailEvent as jest.Mock;

const withDifference = [
  {
    current: true,
    status: "COMPLETADO",
    result: { suggestion: "OBSERVAR", findings: [{ status: "POSIBLE_DIFERENCIA" }] },
  },
];

async function renderControls(props = {}) {
  const onRefresh = jest.fn().mockResolvedValue(undefined);
  await act(async () => {
    render(
      <ReviewControls
        applicationId="app-1"
        expedienteCode="EXP-1"
        applicantName="Ana Pérez"
        applicantEmail="ana@umss.edu"
        version={2}
        canReview
        canObserve
        notification={null}
        onReviewed={jest.fn()}
        onRefresh={onRefresh}
        {...props}
      />,
    );
  });
  return { onRefresh };
}

beforeEach(() => {
  ocrMock.mockReset().mockResolvedValue([]);
  retryMock.mockReset();
});

describe("validateDraft / buildPayload", () => {
  it("exige nota interna al aprobar con diferencia", () => {
    const draft = { ...emptyDraft, decision: "APROBADA" as const };
    expect(validateDraft(draft, true, true).note).toBeDefined();
    expect(validateDraft(draft, false, true)).toEqual({});
  });

  it("observar exige motivo y explicación; rechazar exige causal y nota", () => {
    const observar = { ...emptyDraft, decision: "OBSERVADA" as const };
    expect(Object.keys(validateDraft(observar, false, true)).sort()).toEqual(["note", "reasons"]);
    const rechazar = { ...emptyDraft, decision: "RECHAZADA" as const };
    expect(Object.keys(validateDraft(rechazar, false, true)).sort()).toEqual(["cause", "note"]);
  });

  it("envía siempre la versión que cargó el detalle", () => {
    const payload = buildPayload(
      { decision: "APROBADA", reasons: [], cause: "", note: " interna " },
      5,
    );
    expect(payload).toEqual({ decision: "APROBADA", note: "interna", expectedVersion: 5 });
  });
});

describe("ReviewControls", () => {
  it("pide elegir una decisión antes de abrir la vista previa", async () => {
    await renderControls();
    fireEvent.click(screen.getByRole("button", { name: "Revisar dictamen" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Elige aprobar, observar o rechazar.");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("aprobar con diferencia sin nota no abre la vista previa; con nota sí, y la declaración entra sin marcar", async () => {
    ocrMock.mockResolvedValue(withDifference);
    await renderControls();
    await screen.findByText(
      "El análisis marcó una posible diferencia: la nota interna es obligatoria.",
    );
    fireEvent.click(screen.getByLabelText("Aprobar"));
    fireEvent.click(screen.getByRole("button", { name: "Revisar dictamen" }));
    expect(screen.getByRole("alert")).toHaveTextContent("exige una nota interna");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Nota interna/), {
      target: { value: "Diferencia menor" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Revisar dictamen" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("Volver a editar conserva lo preparado", async () => {
    await renderControls();
    fireEvent.click(screen.getByLabelText("Aprobar"));
    fireEvent.change(screen.getByLabelText(/Nota interna/), { target: { value: "Mi nota" } });
    fireEvent.click(screen.getByRole("button", { name: "Revisar dictamen" }));
    fireEvent.click(await screen.findByRole("button", { name: "Volver a editar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByLabelText(/Nota interna/)).toHaveValue("Mi nota");
  });

  it("muestra el correo fallido y reintenta el mismo envío", async () => {
    retryMock.mockResolvedValue({ ok: true });
    const { onRefresh } = await renderControls({
      canReview: false,
      notification: { eventId: "evt-1", status: "fallida", attempts: 2 },
    });
    expect(screen.getByRole("status")).toHaveTextContent("La decisión se conserva");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar envío" }));
    await waitFor(() => expect(retryMock).toHaveBeenCalledWith("evt-1"));
    await waitFor(() => expect(onRefresh).toHaveBeenCalled());
  });
});