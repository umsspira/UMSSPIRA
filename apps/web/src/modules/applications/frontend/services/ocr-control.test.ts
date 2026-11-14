import {
  acknowledgeOcrPriorities,
  pendingOcrPriorities,
  prioritizeOcr,
  withOcrDeadline,
  withOcrSlot,
} from "./ocr-control";

describe("OCR scheduling safeguards", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    acknowledgeOcrPriorities(pendingOcrPriorities());
  });
  afterEach(() => jest.useRealTimers());

  it("keeps opened order, deduplicates, and preserves openings after a claim snapshot", () => {
    prioritizeOcr("first");
    prioritizeOcr("second");
    prioritizeOcr("first");
    const snapshot = pendingOcrPriorities();
    prioritizeOcr("third");
    expect(snapshot).toEqual(["first", "second"]);
    acknowledgeOcrPriorities(snapshot);
    expect(pendingOcrPriorities()).toEqual(["third"]);
  });

  it("aborts and releases a promise that never settles", async () => {
    let signal!: AbortSignal;
    const work = withOcrDeadline(
      (bounded) => {
        signal = bounded;
        return new Promise(() => undefined);
      },
      undefined,
      1000,
    );
    const rejected = expect(work).rejects.toThrow("tiempo de espera");
    await jest.advanceTimersByTimeAsync(1000);
    await rejected;
    expect(signal.aborted).toBe(true);
    await expect(withOcrDeadline(async () => "next")).resolves.toBe("next");
    expect(jest.getTimerCount()).toBe(0);
  });

  it("propagates cancellation before starting SDK work", async () => {
    const controller = new AbortController();
    controller.abort(new Error("closed"));
    const operation = jest.fn();
    await expect(withOcrDeadline(operation, controller.signal)).rejects.toThrow(
      "closed",
    );
    expect(operation).not.toHaveBeenCalled();
  });

  it("uses the same browser-wide lock and cancels queued work on navigation", async () => {
    const request = jest.fn(async (_name, _options, run) => run());
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: { request },
    });
    const controller = new AbortController();
    await expect(withOcrSlot(controller.signal, async () => 42)).resolves.toBe(
      42,
    );
    expect(request).toHaveBeenCalledWith(
      "umsspira:ocr-inference",
      { signal: controller.signal },
      expect.any(Function),
    );
    controller.abort();
    expect(() => withOcrSlot(controller.signal, async () => 1)).toThrow();
    expect(request).toHaveBeenCalledTimes(1);
  });
});
