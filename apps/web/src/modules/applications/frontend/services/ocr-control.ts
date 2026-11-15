// Bound even SDK/auth promises that do not settle when their underlying worker stops.
export async function withOcrDeadline<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  parent?: AbortSignal,
  milliseconds = 15000,
): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort(parent?.reason);
  if (parent?.aborted) abort();
  parent?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(
    () =>
      controller.abort(
        new Error(
          "Se agotó el tiempo de espera del OCR. Se continuará con la cola.",
        ),
      ),
    milliseconds,
  );
  let rejectAbort: () => void = () => undefined;
  const cancelled = new Promise<never>((_, reject) => {
    rejectAbort = () => reject(controller.signal.reason);
    controller.signal.addEventListener("abort", rejectAbort, { once: true });
    if (controller.signal.aborted) rejectAbort();
  });
  try {
    return await Promise.race([
      Promise.resolve().then(() => {
        controller.signal.throwIfAborted();
        return operation(controller.signal);
      }),
      cancelled,
    ]);
  } finally {
    clearTimeout(timer);
    parent?.removeEventListener("abort", abort);
    controller.signal.removeEventListener("abort", rejectAbort);
  }
}

// One inference per browser profile/origin, including other inbox tabs.
export function withOcrSlot<T>(signal: AbortSignal, run: () => Promise<T>) {
  signal.throwIfAborted();
  return navigator.locks
    ? navigator.locks.request("umsspira:ocr-inference", { signal }, run)
    : run();
}

const opened: string[] = [];
export function prioritizeOcr(applicationId: string) {
  if (!opened.includes(applicationId)) opened.push(applicationId);
  if (opened.length > 20) opened.shift();
  window.dispatchEvent(new Event("umsspira:ocr-priority"));
}
export function pendingOcrPriorities() {
  return [...opened];
}
export function acknowledgeOcrPriorities(ids: string[]) {
  for (const id of ids) {
    const index = opened.indexOf(id);
    if (index !== -1) opened.splice(index, 1);
  }
}
