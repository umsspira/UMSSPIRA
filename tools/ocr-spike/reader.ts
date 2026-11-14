import type { OcrReading } from "../../packages/shared-types/src/ocr";

export const OCR_ENGINE = "PaddleOCR.js@0.4.2/PP-OCRv6_small/es";
const MAX_PAGES = 5;
const MAX_SIDE = 1800;
type Engine = Awaited<
  ReturnType<typeof import("@paddleocr/paddleocr-js").PaddleOCR.create>
>;
let cachedEngine: Engine | undefined;
let cachedWorker: Worker | undefined;
export function disposeOcrEngine() {
  cachedWorker?.terminate();
  cachedWorker = undefined;
  cachedEngine = undefined;
}

export async function readOcrDocument(
  blob: Blob,
  signal: AbortSignal,
  progress: (message: string) => void,
): Promise<OcrReading> {
  if (blob.size > 5 * 1024 * 1024) throw new Error("El respaldo supera 5 MB.");
  if (!["application/pdf", "image/jpeg", "image/png"].includes(blob.type))
    throw new Error("Formato no compatible.");
  signal.throwIfAborted();
  const start = performance.now();
  progress("Cargando el motor de lectura…");
  const sdkUrl = "/ocr/runtime/sdk.mjs";
  const { PaddleOCR } = (await import(
    /* webpackIgnore: true */ sdkUrl
  )) as typeof import("@paddleocr/paddleocr-js");
  // Keep a reference to terminate the actual Worker on route changes, loss of lease or timeout.
  signal.throwIfAborted();
  let worker: Worker | undefined = cachedWorker;
  const terminate = () => {
    worker?.terminate();
    if (cachedWorker === worker) disposeOcrEngine();
  };
  signal.addEventListener("abort", terminate, { once: true });
  const ocr =
    cachedEngine ??
    (await PaddleOCR.create({
      initialize: false,
      lang: "es",
      ocrVersion: "PP-OCRv6",
      textDetectionModelName: "PP-OCRv6_small_det",
      textRecognitionModelName: "PP-OCRv6_small_rec",
      worker: {
        createWorker: () => {
          worker = new Worker("/ocr/runtime/paddle-worker.js", {
            type: "module",
          });
          return worker;
        },
      },
      textDetectionModelAsset: {
        url: new URL("/ocr/models/PP-OCRv6_small_det.tar", location.origin)
          .href,
      },
      textRecognitionModelAsset: {
        url: new URL("/ocr/models/PP-OCRv6_small_rec.tar", location.origin)
          .href,
      },
      ortOptions: {
        backend: "wasm",
        numThreads: 1,
        wasmPaths: new URL("/ocr/runtime/", location.origin).href,
      },
      textRecognitionBatchSize: 1,
    }));
  if (signal.aborted) {
    terminate();
    signal.throwIfAborted();
  }
  cachedEngine = ocr;
  cachedWorker = worker;
  let healthy = false;
  let pdf: import("pdfjs-dist").PDFDocumentProxy | undefined;
  let loading: import("pdfjs-dist").PDFDocumentLoadingTask | undefined;
  // Terminating a worker does not settle pending SDK promises. Race every operation against abort.
  const abortable = <T>(task: Promise<T>): Promise<T> =>
    new Promise((resolve, reject) => {
      const abort = () =>
        reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
      if (signal.aborted) {
        abort();
        return;
      }
      signal.addEventListener("abort", abort, { once: true });
      task
        .then(resolve, reject)
        .finally(() => signal.removeEventListener("abort", abort));
    });
  try {
    await abortable(ocr.initialize());
    const loadMs = performance.now() - start;
    const readStart = performance.now();
    if (blob.type === "application/pdf") {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = "/ocr/runtime/pdf.worker.min.mjs";
      loading = pdfjs.getDocument({
        data: new Uint8Array(await blob.arrayBuffer()),
        isEvalSupported: false,
      });
      pdf = await abortable(loading.promise);
    }
    const totalPages = pdf?.numPages ?? 1;
    const pagesRead = Math.min(totalPages, MAX_PAGES);
    const lines: OcrReading["lines"] = [];
    let truncated = totalPages > MAX_PAGES;
    let payloadBytes = 0;
    for (let page = 1; page <= pagesRead; page++) {
      signal.throwIfAborted();
      progress(`Leyendo página ${page} de ${totalPages}…`);
      const canvas = document.createElement("canvas");
      let bitmap: ImageBitmap | undefined;
      try {
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas no disponible.");
        if (pdf) {
          const documentPage = await abortable(pdf.getPage(page));
          const base = documentPage.getViewport({ scale: 1 });
          const viewport = documentPage.getViewport({
            scale: Math.min(2, MAX_SIDE / Math.max(base.width, base.height)),
          });
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          await abortable(
            documentPage.render({ canvasContext: context, viewport }).promise,
          );
          documentPage.cleanup();
        } else {
          bitmap = await abortable(createImageBitmap(blob));
          const scale = Math.min(
            1,
            MAX_SIDE / Math.max(bitmap.width, bitmap.height),
          );
          canvas.width = Math.ceil(bitmap.width * scale);
          canvas.height = Math.ceil(bitmap.height * scale);
          context.fillStyle = "#fff";
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        }
        const [result] = await abortable(ocr.predict(canvas));
        for (const item of result.items) {
          if (lines.length >= 1500) {
            truncated = true;
            break;
          }
          const line = {
            text: item.text.slice(0, 1000),
            confidence: item.score,
            page,
            box: item.poly.map((point) => [
              Math.max(0, point[0]),
              Math.max(0, point[1]),
            ]),
          };
          const bytes = new TextEncoder().encode(
            JSON.stringify(line),
          ).byteLength;
          if (payloadBytes + bytes > 80000) {
            truncated = true;
            break;
          }
          if (item.text.length > 1000) truncated = true;
          payloadBytes += bytes;
          lines.push(line);
        }
      } finally {
        bitmap?.close();
        canvas.width = 0;
        canvas.height = 0;
      }
    }
    const memory = (
      performance as Performance & { memory?: { usedJSHeapSize: number } }
    ).memory?.usedJSHeapSize;
    healthy = true;
    return {
      lines,
      pagesRead,
      totalPages,
      partial: truncated,
      engine: OCR_ENGINE,
      loadMs,
      readMs: performance.now() - readStart,
      ...(memory ? { memoryBytes: memory } : {}),
    };
  } finally {
    signal.removeEventListener("abort", terminate);
    // Keep one initialized engine for this board; discard it on error, abort or navigation.
    if (!healthy || signal.aborted) terminate();
    if (pdf) await pdf.destroy();
    else if (loading) await loading.destroy();
  }
}
