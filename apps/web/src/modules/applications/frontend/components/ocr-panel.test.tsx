import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import type { OcrAnalysis } from "@umsspira/shared-types";
import { OcrPanel } from "./ocr-panel";
import { ocrRequest, OcrHttpError } from "../services/ocr-api";

jest.mock("../services/ocr-api", () => ({
  ...jest.requireActual("../services/ocr-api"),
  ocrRequest: jest.fn(),
}));
const request = jest.mocked(ocrRequest);
const completed: OcrAnalysis = {
  id: "job",
  revision: 1,
  current: true,
  status: "COMPLETADO",
  createdAt: "2026-11-16T16:00:00Z",
  completedAt: "2026-11-18T13:53:22Z",
  error: null,
  result: {
    suggestion: "REVISION_MANUAL",
    reason: "Faltan datos comprobables.",
    rulesVersion: "test",
    findings: [
      {
        field: "ci",
        label: "CI",
        declared: "123",
        read: null,
        evidence: null,
        status: "NO_COMPROBADO",
        reason: "El documento no contiene el dato.",
      },
    ],
    reading: {
      lines: [],
      pagesRead: 1,
      totalPages: 1,
      partial: false,
      engine: "test",
      loadMs: 1,
      readMs: 1,
    },
  },
};
const failed: OcrAnalysis = {
  ...completed,
  status: "FALLIDO",
  result: null,
  completedAt: "2026-11-16T20:57:31Z",
  error: "No se pudo leer el respaldo.",
};
const tick = async () => {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(0);
  });
};
beforeEach(() => {
  jest.useFakeTimers();
  jest.resetAllMocks();
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: "visible",
  });
});
afterEach(() => {
  cleanup();
  jest.useRealTimers();
});

it("distinguishes a completed reading with insufficient data from a processing failure", async () => {
  request.mockResolvedValue([completed] as never);
  render(
    <OcrPanel applicationId="application" documentUrl="/document" canRetry />,
  );
  await tick();
  expect(screen.getByText("Revisar hallazgos")).toBeInTheDocument();
  expect(screen.getByText("Sin lectura")).toBeInTheDocument();
  expect(screen.queryByText("Falló el procesamiento")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Reintentar análisis" }),
  ).not.toBeInTheDocument();

  const field = screen.getByRole("button", { name: "CI" });
  expect(screen.queryByText("El documento no contiene el dato.")).not.toBeInTheDocument();
  fireEvent.click(field);
  expect(screen.getByRole("region", { name: "Detalle de CI" })).toHaveTextContent(
    "El documento no contiene el dato.",
  );
  fireEvent.click(field);
  expect(screen.queryByRole("region", { name: "Detalle de CI" })).not.toBeInTheDocument();
});

it("shows the date of an old failure and requeues it only when requested", async () => {
  let analysis = failed;
  request.mockImplementation(async (path) => {
    if (path.endsWith("/retry")) {
      analysis = {
        ...failed,
        status: "PENDIENTE",
        error: null,
        completedAt: null,
      };
      return { saved: true } as never;
    }
    return [analysis] as never;
  });
  render(
    <OcrPanel applicationId="application" documentUrl="/document" canRetry />,
  );
  await tick();
  expect(screen.getByText("Falló el procesamiento")).toBeInTheDocument();
  expect(screen.getByText(/Último fallo:.*16\/11\/2026/)).toBeInTheDocument();
  expect(request.mock.calls.some(([path]) => path.endsWith("/retry"))).toBe(
    false,
  );
  fireEvent.click(screen.getByRole("button", { name: "Reintentar análisis" }));
  await tick();
  expect(request).toHaveBeenCalledWith(
    "ocr/job/retry",
    {},
    expect.any(AbortSignal),
  );
  expect(screen.getByText("Pendiente")).toBeInTheDocument();
  expect(
    screen.getByText(/Mantén la bandeja abierta y visible/),
  ).toBeInTheDocument();
});

it("treats a failed query as a connection problem and allows immediate refresh", async () => {
  request.mockRejectedValueOnce(new OcrHttpError(503));
  request.mockResolvedValue([completed] as never);
  render(<OcrPanel applicationId="application" documentUrl="/document" />);
  await tick();
  expect(screen.getByText("Consulta no disponible")).toBeInTheDocument();
  expect(screen.getByText(/HTTP 503/)).toBeInTheDocument();
  expect(screen.queryByText("Falló el procesamiento")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Volver a consultar" }));
  await tick();
  expect(screen.getByText("Revisar hallazgos")).toBeInTheDocument();
  expect(screen.queryByText("Consulta no disponible")).not.toBeInTheDocument();
});

it("keeps a saved result visible if refreshing its status fails", async () => {
  request.mockResolvedValueOnce([completed] as never);
  request.mockRejectedValue(new OcrHttpError(503));
  render(<OcrPanel applicationId="application" documentUrl="/document" />);
  await tick();
  act(() => window.dispatchEvent(new Event("umsspira:ocr-updated")));
  await tick();
  expect(screen.getByText("Revisar hallazgos")).toBeInTheDocument();
  expect(screen.getByRole("table")).toBeInTheDocument();
  expect(
    screen.getByText("Se conserva el último estado consultado."),
  ).toBeInTheDocument();
});

it("does not offer a processing retry for a resolved application", async () => {
  request.mockResolvedValue([failed] as never);
  render(
    <OcrPanel
      applicationId="application"
      documentUrl="/document"
      canRetry={false}
    />,
  );
  await tick();
  expect(
    screen.queryByRole("button", { name: "Reintentar análisis" }),
  ).not.toBeInTheDocument();
});

it("explains why queued work stops after the application is resolved", async () => {
  request.mockResolvedValue([
    { ...failed, status: "DESCARTADO", error: null },
  ] as never);
  render(<OcrPanel applicationId="application" documentUrl="/document" />);
  await tick();
  expect(screen.getByText("Procesamiento detenido")).toBeInTheDocument();
  expect(screen.getByText(/la solicitud fue resuelta/)).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Reintentar análisis" }),
  ).not.toBeInTheDocument();
});

it("refreshes instead of overwriting a job claimed by another session during retry", async () => {
  let analysis = failed;
  request.mockImplementation(async (path) => {
    if (path.endsWith("/retry")) {
      analysis = {
        ...failed,
        status: "EN_CURSO",
        error: null,
        completedAt: null,
      };
      throw new OcrHttpError(409);
    }
    return [analysis] as never;
  });
  render(
    <OcrPanel applicationId="application" documentUrl="/document" canRetry />,
  );
  await tick();
  fireEvent.click(screen.getByRole("button", { name: "Reintentar análisis" }));
  await tick();
  expect(screen.getByText("En curso")).toBeInTheDocument();
  expect(screen.queryByText("Pendiente")).not.toBeInTheDocument();
});
