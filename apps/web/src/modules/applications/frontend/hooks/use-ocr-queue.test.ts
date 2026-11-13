import { act, renderHook } from "@testing-library/react";
import { useOcrQueue } from "./use-ocr-queue";
import { ocrRequest } from "../services/ocr-api";
import { readOcrDocument } from "../services/ocr-browser";
import { authenticatedFetch } from "@/shared/services/auth-session";
import {
  acknowledgeOcrPriorities,
  pendingOcrPriorities,
  prioritizeOcr,
} from "../services/ocr-control";

jest.mock("../services/ocr-api", () => ({ ocrRequest: jest.fn() }));
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
  expiresAt: "",
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
      request.mock.calls.some(([path]) => path === "ocr/hidden/fail"),
    ).toBe(true);
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
});
