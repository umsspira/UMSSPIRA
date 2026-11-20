import { act, render, screen, waitFor } from "@testing-library/react";
import { HistoryTab } from "./history-tab";
import { fetchApplicationHistory } from "../services/applications-board.service";
import { ocrRequest } from "../services/ocr-api";

jest.mock("../services/applications-board.service", () => ({
  fetchApplicationHistory: jest.fn(),
}));
jest.mock("../services/ocr-api", () => ({ ocrRequest: jest.fn() }));
jest.mock("../services/ocr-control", () => ({ prioritizeOcr: jest.fn() }));
let mockPoll: () => Promise<void>;
jest.mock("../services/ocr-polling", () => ({
  pollOcr: (load: () => Promise<void>) => {
    mockPoll = load;
    void load();
    return jest.fn();
  },
}));

describe("Historial debajo del respaldo", () => {
  const received = "2026-11-20T12:00:00Z";
  const completed = "2026-11-20T12:02:00Z";

  beforeEach(() => {
    jest.clearAllMocks();
    (fetchApplicationHistory as jest.Mock).mockResolvedValue({
      ok: true,
      data: { events: [] },
    });
    (ocrRequest as jest.Mock).mockResolvedValue([
      {
        id: "ocr-1",
        revision: 1,
        current: true,
        status: "COMPLETADO",
        completedAt: completed,
      },
    ]);
  });

  it("muestra fechas de recepción y OCR sin repetir el desglose completo", async () => {
    render(<HistoryTab applicationId="app-1" compact submittedAt={received} />);
    await waitFor(() => expect(screen.getAllByRole("time")).toHaveLength(2));
    const heading = screen.getByRole('heading', { name: 'Historial del expediente' });
    expect(heading.compareDocumentPosition(screen.getAllByRole('time')[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(
      screen.getAllByRole("time").map((time) => time.getAttribute("dateTime")),
    ).toEqual([received, completed]);
    expect(
      screen.queryByText("Resultado automático más reciente"),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("actualiza los movimientos cuando termina un nuevo análisis OCR", async () => {
    (ocrRequest as jest.Mock).mockResolvedValueOnce([
      {
        id: "ocr-1",
        revision: 1,
        current: true,
        status: "EN_CURSO",
        completedAt: null,
      },
    ]);
    render(<HistoryTab applicationId="app-1" compact />);
    await waitFor(() =>
      expect(fetchApplicationHistory).toHaveBeenCalledTimes(1),
    );
    await act(async () => {
      await mockPoll();
    });
    await waitFor(() =>
      expect(fetchApplicationHistory).toHaveBeenCalledTimes(2),
    );
  });

  it("muestra el error de historial sin inventar movimientos", async () => {
    (fetchApplicationHistory as jest.Mock).mockResolvedValue({
      ok: false,
      message: "No tienes acceso al historial.",
    });
    render(<HistoryTab applicationId="app-1" compact submittedAt={received} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No tienes acceso al historial.",
    );
    expect(
      screen.queryByRole("list", { name: "Acciones del expediente" }),
    ).not.toBeInTheDocument();
  });
});
