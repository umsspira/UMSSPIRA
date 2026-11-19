import { act, renderHook } from "@testing-library/react";
import { useOcrQueue } from "./use-ocr-queue";
import { ocrRequest } from "../services/ocr-api";
import { readOcrDocument } from "../services/ocr-browser";
import { authenticatedFetch } from "@/shared/services/auth-session";
import { OcrFailureError } from "../services/ocr-errors";
import { OcrHttpError } from "../services/ocr-api";
import {
  acknowledgeOcrPriorities,
  pendingOcrPriorities,
  prioritizeOcr,
} from "../services/ocr-control";

jest.mock("../services/ocr-api", () => ({
  ...jest.requireActual("../services/ocr-api"),
  ocrRequest: jest.fn(),
}));
jest.mock("../services/ocr-browser", () => ({
  readOcrDocument: jest.fn(),
  disposeOcrEngine: jest.fn(),
}));
jest.mock("@/shared/services/auth-session", () => ({
  authenticatedFetch: jest.fn(),
}));
const request = jest.mocked(ocrRequest);
const read = jest.mocked(readOcrDocument);
const fetchDocument = jest.mocked(authenticatedFetch);
const job = (id: string) => ({
  id,
  applicationId: id,
  revision: 1,
  token: id,
  expiresAt: "2027-01-01T00:00:00.000Z",
});
const tick = async (ms = 0) => {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
};

describe("OCR inbox queue", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.resetAllMocks();
    acknowledgeOcrPriorities(pendingOcrPriorities());
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: undefined,
    });
    fetchDocument.mockResolvedValue({
      ok: true,
      blob: async () => new Blob(),
    } as Response);
  });
  afterEach(() => jest.useRealTimers());

  it.each([
    ["array", []],
    ["empty object", {}],
    ["missing data", undefined],
    ["string", "invalid"],
    ["missing token", { ...job("invalid"), token: "" }],
    ["missing application", { ...job("invalid"), applicationId: undefined }],
    ["invalid revision", { ...job("invalid"), revision: 0 }],
    ["invalid expiration", { ...job("invalid"), expiresAt: "invalid" }],
  ])(
    "rejects %s without downloading or reporting a fake job, then recovers",
    async (_name, invalid) => {
      request.mockImplementation(async (path) =>
        path === "ocr/claim" ? (null as never) : ({} as never),
      );
      request.mockResolvedValueOnce(invalid as never);
      read.mockResolvedValue({} as never);
      const { result, unmount } = renderHook(() => useOcrQueue());
      await tick();
      expect(result.current).toContain("reserva OCR recibida no es válida");
      expect(request.mock.calls.map(([path]) => path)).toEqual(["ocr/claim"]);
      expect(fetchDocument).not.toHaveBeenCalled();
      expect(read).not.toHaveBeenCalled();
      await tick(29999);
      expect(request).toHaveBeenCalledTimes(1);
      request.mockResolvedValueOnce(job("recovered") as never);
      await tick(1);
      expect(fetchDocument).toHaveBeenCalledWith(
        "/api/v1/applications/ocr/recovered/document",
        expect.any(Object),
      );
      expect(
        request.mock.calls.some(([path]) => path === "ocr/recovered/complete"),
      ).toBe(true);
      expect(request.mock.calls.some(([path]) => path.endsWith("/fail"))).toBe(
        false,
      );
      unmount();
      await tick();
      expect(jest.getTimerCount()).toBe(0);
    },
  );

  it("accepts null as an empty queue without starting a document read", async () => {
    request.mockResolvedValue(null as never);
    const { result, unmount } = renderHook(() => useOcrQueue());
    await tick();
    expect(result.current).toContain("Análisis automático disponible");
    expect(fetchDocument).not.toHaveBeenCalled();
    expect(read).not.toHaveBeenCalled();
    unmount();
    await tick();
    expect(jest.getTimerCount()).toBe(0);
  });

  it("finishes the active job, then processes opened requests in order before background work", async () => {
    let finish!: (value: never) => void;
    read.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    read.mockResolvedValue({} as never);
    const remaining = new Set(["active", "background", "opened1", "opened2"]);
    const claimed: string[] = [];
    request.mockImplementation(async (path, body) => {
      if (path !== "ocr/claim") return {} as never;
      const ids = (body as { applicationIds: string[] }).applicationIds;
      const id =
        ids.find((value) => remaining.has(value)) ??
        remaining.values().next().value;
      if (!id) return null as never;
      remaining.delete(id);
      claimed.push(id);
      return job(id) as never;
    });
    const { unmount } = renderHook(() => useOcrQueue());
    await tick();
    act(() => {
      prioritizeOcr("opened1");
      prioritizeOcr("opened2");
    });
    await tick(5000);
    expect(claimed).toEqual(["active"]);
    await act(async () => finish({} as never));
    await tick(3000);
    expect(claimed).toEqual(["active", "opened1", "opened2", "background"]);
    expect(
      request.mock.calls.filter(([path]) => path.endsWith("/complete")),
    ).toHaveLength(4);
    unmount();
    await tick();
  });

  it("releases a timed out document and continues with another instead of blocking the queue", async () => {
    read.mockImplementationOnce(
      (_blob, signal) =>
        new Promise((_, reject) => {
          signal.addEventListener("abort", () => reject(signal.reason), {
            once: true,
          });
        }),
    );
    read.mockResolvedValue({} as never);
    request.mockImplementation(async (path) =>
      path === "ocr/claim" ? (null as never) : ({} as never),
    );
    request.mockResolvedValueOnce(job("stuck") as never);
    const { unmount } = renderHook(() => useOcrQueue());
    await tick();
    const rejected = request.mock.calls.filter(([path]) =>
      path.endsWith("/fail"),
    );
    expect(rejected).toHaveLength(0);
    await tick(150000);
    expect(request.mock.calls.some(([path]) => path === "ocr/stuck/fail")).toBe(
      true,
    );
    expect(request).toHaveBeenCalledWith("ocr/stuck/fail", {
      token: "stuck",
      failure: { stage: "engine", code: "TIMEOUT" },
    });
    const claims = request.mock.calls.filter(
      ([path]) => path === "ocr/claim",
    ).length;
    await tick(1000);
    expect(
      request.mock.calls.filter(([path]) => path === "ocr/claim"),
    ).toHaveLength(claims + 1);
    unmount();
    await tick();
  });

  it("backs off on claim errors even when an opened request is pending", async () => {
    prioritizeOcr("opened");
    request.mockRejectedValue(new Error("offline"));
    const { unmount } = renderHook(() => useOcrQueue());
    await tick();
    await tick(29999);
    expect(request).toHaveBeenCalledTimes(1);
    await tick(1);
    expect(request).toHaveBeenCalledTimes(2);
    unmount();
  });

  it("releases hidden-tab work and resumes claiming only after the inbox is visible", async () => {
    read.mockImplementation(
      (_blob, signal) =>
        new Promise((_, reject) => {
          signal.addEventListener("abort", () => reject(signal.reason), {
            once: true,
          });
        }),
    );
    request.mockImplementation(async (path) =>
      path === "ocr/claim" ? (null as never) : ({} as never),
    );
    request.mockResolvedValueOnce(job("hidden") as never);
    const { unmount } = renderHook(() => useOcrQueue());
    await tick();
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    await tick();
    expect(
      request.mock.calls.some(([path]) => path === "ocr/hidden/release"),
    ).toBe(true);
    expect(request.mock.calls.some(([path]) => path.endsWith("/fail"))).toBe(
      false,
    );
    await tick(30000);
    expect(
      request.mock.calls.filter(([path]) => path === "ocr/claim"),
    ).toHaveLength(1);
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    await tick();
    expect(
      request.mock.calls.filter(([path]) => path === "ocr/claim"),
    ).toHaveLength(2);
    unmount();
  });

  it("sends the actual HTTP status and stage when downloading fails", async () => {
    request.mockImplementation(async (path) =>
      path === "ocr/claim" ? (null as never) : ({} as never),
    );
    request.mockResolvedValueOnce(job("download") as never);
    fetchDocument.mockResolvedValue({ ok: false, status: 503 } as Response);
    const { result, unmount } = renderHook(() => useOcrQueue());
    await tick();
    expect(request).toHaveBeenCalledWith("ocr/download/fail", {
      token: "download",
      failure: { stage: "document", code: "HTTP_ERROR", status: 503 },
    });
    expect(result.current).toContain("descargar el respaldo (HTTP 503)");
    expect(read).not.toHaveBeenCalled();
    unmount();
  });

  it("preserves a reading failure instead of attributing it to engine loading", async () => {
    request.mockImplementation(async (path) =>
      path === "ocr/claim" ? (null as never) : ({} as never),
    );
    request.mockResolvedValueOnce(job("read") as never);
    read.mockRejectedValue(
      new OcrFailureError({ stage: "read", code: "PROCESSING_ERROR" }),
    );
    const { unmount } = renderHook(() => useOcrQueue());
    await tick();
    expect(request).toHaveBeenCalledWith("ocr/read/fail", {
      token: "read",
      failure: { stage: "read", code: "PROCESSING_ERROR" },
    });
    unmount();
  });

  it("releases a reservation received after the inbox was hidden", async () => {
    let claimed!: (value: never) => void;
    request.mockImplementation(
      () =>
        new Promise((resolve) => {
          claimed = resolve;
        }),
    );
    const { unmount } = renderHook(() => useOcrQueue());
    await tick();
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    request.mockResolvedValue({} as never);
    await act(async () => claimed(job("late") as never));
    await tick();
    expect(request).toHaveBeenCalledWith("ocr/late/release", { token: "late" });
    expect(fetchDocument).not.toHaveBeenCalled();
    unmount();
  });

  it("reports a result rejected by the API as a save failure", async () => {
    request.mockImplementation(async (path) => {
      if (path.endsWith("/complete")) throw new OcrHttpError(400);
      return path === "ocr/claim" ? (null as never) : ({} as never);
    });
    request.mockResolvedValueOnce(job("save") as never);
    read.mockResolvedValue({} as never);
    const { result, unmount } = renderHook(() => useOcrQueue());
    await tick();
    expect(request).toHaveBeenCalledWith("ocr/save/fail", {
      token: "save",
      failure: { stage: "complete", code: "HTTP_ERROR", status: 400 },
    });
    expect(result.current).toContain("guardar el resultado (HTTP 400)");
    unmount();
  });

  it("releases work on navigation without reporting a document failure", async () => {
    request.mockResolvedValueOnce(job("navigation") as never);
    read.mockImplementation(
      (_blob, signal) =>
        new Promise((_, reject) => {
          signal.addEventListener("abort", () => reject(signal.reason), {
            once: true,
          });
        }),
    );
    const { unmount } = renderHook(() => useOcrQueue());
    await tick();
    unmount();
    await tick();
    expect(request).toHaveBeenCalledWith("ocr/navigation/release", {
      token: "navigation",
    });
    expect(request.mock.calls.some(([path]) => path.endsWith("/fail"))).toBe(
      false,
    );
  });
});
