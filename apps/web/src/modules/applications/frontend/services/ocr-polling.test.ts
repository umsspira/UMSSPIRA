import { pollOcr } from "./ocr-polling";
describe("OCR polling", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
  });
  afterEach(() => jest.useRealTimers());
  it("waits longer after errors and stops after abort", async () => {
    const controller = new AbortController();
    const load = jest.fn().mockRejectedValue(new Error("network"));
    const stop = pollOcr(load, controller.signal);
    await jest.advanceTimersByTimeAsync(0);
    expect(load).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(29999);
    expect(load).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);
    expect(load).toHaveBeenCalledTimes(2);
    await jest.advanceTimersByTimeAsync(59999);
    expect(load).toHaveBeenCalledTimes(2);
    controller.abort();
    stop();
    await jest.advanceTimersByTimeAsync(120000);
    expect(load).toHaveBeenCalledTimes(2);
  });
  it("does not overlap requests or refresh events", async () => {
    const controller = new AbortController();
    let done!: () => void;
    const load = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          done = resolve;
        }),
    );
    const stop = pollOcr(load, controller.signal);
    window.dispatchEvent(new Event("umsspira:ocr-updated"));
    await jest.advanceTimersByTimeAsync(60000);
    expect(load).toHaveBeenCalledTimes(1);
    done();
    await jest.advanceTimersByTimeAsync(0);
    await jest.advanceTimersByTimeAsync(15000);
    expect(load).toHaveBeenCalledTimes(2);
    controller.abort();
    stop();
    done();
  });
  it("refreshes active results sooner and reduces polling after completion", async () => {
    const controller = new AbortController();
    let pending = true;
    const load = jest.fn().mockResolvedValue(undefined);
    const stop = pollOcr(load, controller.signal, () =>
      pending ? 3000 : 30000,
    );
    await jest.advanceTimersByTimeAsync(0);
    expect(load).toHaveBeenCalledTimes(1);
    pending = false;
    await jest.advanceTimersByTimeAsync(3000);
    expect(load).toHaveBeenCalledTimes(2);
    await jest.advanceTimersByTimeAsync(29999);
    expect(load).toHaveBeenCalledTimes(2);
    await jest.advanceTimersByTimeAsync(1);
    expect(load).toHaveBeenCalledTimes(3);
    controller.abort();
    stop();
  });
});
