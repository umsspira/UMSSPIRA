import { act, renderHook } from "@testing-library/react";

import { useImageQuality } from "./use-image-quality";
import { analyzeImageFile } from "../lib/image-quality";
import type { ImageQualityResult } from "../lib/image-quality.types";

jest.mock("../lib/image-quality", () => ({
  ...jest.requireActual("../lib/image-quality"),
  analyzeImageFile: jest.fn(),
}));

const mockedAnalyze = analyzeImageFile as jest.MockedFunction<typeof analyzeImageFile>;

function createDeferred() {
  let resolve!: (value: ImageQualityResult) => void;
  const promise = new Promise<ImageQualityResult>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const blurryResult: ImageQualityResult = {
  status: "done",
  warnings: [{ code: "BLURRY", message: "borrosa", recommendation: "enfoca" }],
  metrics: null,
};
const clearResult: ImageQualityResult = { status: "done", warnings: [], metrics: null };
const fileA = new File(["a"], "a.jpg", { type: "image/jpeg" });
const fileB = new File(["b"], "b.jpg", { type: "image/jpeg" });

describe("useImageQuality", () => {
  beforeEach(() => mockedAnalyze.mockReset());

  it("empieza en idle", () => {
    const { result } = renderHook(() => useImageQuality());
    expect(result.current.result.status).toBe("idle");
  });

  it("pasa por analyzing y termina con el resultado", async () => {
    const deferred = createDeferred();
    mockedAnalyze.mockReturnValueOnce(deferred.promise);
    const { result } = renderHook(() => useImageQuality());

    let pending!: Promise<void>;
    act(() => {
      pending = result.current.analyze(fileA);
    });
    expect(result.current.result.status).toBe("analyzing");

    await act(async () => {
      deferred.resolve(blurryResult);
      await pending;
    });
    expect(result.current.result).toEqual(blurryResult);
  });

  it("descarta el resultado de un archivo anterior si se reemplaza rapido", async () => {
    const first = createDeferred();
    const second = createDeferred();
    mockedAnalyze.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result } = renderHook(() => useImageQuality());

    let pendingA!: Promise<void>;
    let pendingB!: Promise<void>;
    act(() => {
      pendingA = result.current.analyze(fileA);
      pendingB = result.current.analyze(fileB);
    });

    await act(async () => {
      second.resolve(clearResult);
      await pendingB;
    });
    await act(async () => {
      first.resolve(blurryResult);
      await pendingA;
    });

    expect(result.current.result).toEqual(clearResult);
  });

  it("limpia los avisos al quitar el archivo y no deja reaparecer el anterior", async () => {
    const deferred = createDeferred();
    mockedAnalyze.mockReturnValueOnce(deferred.promise);
    const { result } = renderHook(() => useImageQuality());

    let pending!: Promise<void>;
    act(() => {
      pending = result.current.analyze(fileA);
    });
    act(() => result.current.reset());
    await act(async () => {
      deferred.resolve(blurryResult);
      await pending;
    });

    expect(result.current.result.status).toBe("idle");
    expect(result.current.result.warnings).toEqual([]);
  });

  it("devuelve failed si el analisis lanza un error", async () => {
    mockedAnalyze.mockRejectedValueOnce(new Error("fallo"));
    const { result } = renderHook(() => useImageQuality());

    await act(async () => {
      await result.current.analyze(fileA);
    });

    expect(result.current.result.status).toBe("failed");
  });
});