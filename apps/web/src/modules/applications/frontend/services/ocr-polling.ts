// One request at a time; network failures back off instead of flooding the shared API.
export function pollOcr(
  load: () => Promise<unknown>,
  signal: AbortSignal,
  interval = () => 15000,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running = false;
  let delay = 15000;
  const run = async () => {
    if (signal.aborted || running) return;
    clearTimeout(timer);
    if (document.visibilityState === "hidden") {
      timer = setTimeout(run, delay);
      return;
    }
    running = true;
    try {
      await load();
      delay = interval();
    } catch {
      delay = Math.min(delay * 2, 120000);
    } finally {
      running = false;
      if (!signal.aborted) timer = setTimeout(run, delay);
    }
  };
  const refresh = () => {
    void run();
  };
  window.addEventListener("umsspira:ocr-updated", refresh);
  document.addEventListener("visibilitychange", refresh);
  void run();
  return () => {
    clearTimeout(timer);
    window.removeEventListener("umsspira:ocr-updated", refresh);
    document.removeEventListener("visibilitychange", refresh);
  };
}
