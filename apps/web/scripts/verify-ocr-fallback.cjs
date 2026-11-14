const { strict: assert } = require("node:assert");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { build } = require("esbuild");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
async function main() {
  const compiled = await build({
    entryPoints: [
      resolve("src/modules/applications/frontend/services/ocr-browser.ts"),
    ],
    bundle: true,
    format: "esm",
    platform: "browser",
    write: false,
    external: ["/ocr/runtime/sdk.mjs"],
  });
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.OCR_BROWSER_PATH
      ? { executablePath: process.env.OCR_BROWSER_PATH }
      : {}),
  });
  try {
    for (const abort of [false, true]) {
      const page = await browser.newPage();
      await page.route("**/__fallback", (r) =>
        r.fulfill({
          contentType: "text/html",
          body: "<!doctype html><title>OCR test</title>",
        }),
      );
      await page.route("**/reader.mjs", (r) =>
        r.fulfill({
          contentType: "text/javascript",
          body: compiled.outputFiles[0].text,
        }),
      );
      await page.route("**/ocr/runtime/sdk.mjs", (r) =>
        r.fulfill({
          contentType: "text/javascript",
          body: `
    export class PaddleOCR {
     static async create(options) {
      (globalThis.backends ??= []).push(options.ortOptions.backend);
      const gpu=options.ortOptions.backend==='auto';
      return {
       async initialize(){},
       getInitializationSummary(){return {detProvider:gpu?'webgpu':'wasm',recProvider:gpu?'webgpu':'wasm'};},
       async predict(){
        if(gpu) { if(globalThis.abortTest) globalThis.controller.abort(); throw new Error('GPU device lost'); }
        return [{items:[{text:'Dato',score:0.99,poly:[[0,0],[10,0],[10,10],[0,10]]}]}];
       }
      };
     }
    }`,
        }),
      );
      await page.addInitScript(() =>
        Object.defineProperty(navigator, "gpu", {
          value: { requestAdapter: async () => ({}) },
        }),
      );
      await page.goto("http://localhost:3001/__fallback");
      const result = await page.evaluate(
        async ({ bytes, abort }) => {
          globalThis.abortTest = abort;
          globalThis.controller = new AbortController();
          const { readOcrDocument, disposeOcrEngine } =
            await import("/reader.mjs");
          try {
            const reading = await readOcrDocument(
              new Blob([Uint8Array.from(atob(bytes), (c) => c.charCodeAt(0))], {
                type: "image/png",
              }),
              controller.signal,
              () => {},
            );
            return {
              backends: globalThis.backends,
              lines: reading.lines.length,
            };
          } catch {
            return {
              backends: globalThis.backends,
              aborted: controller.signal.aborted,
            };
          } finally {
            disposeOcrEngine();
          }
        },
        {
          bytes: readFileSync("tests/fixtures/ocr/respaldo.png").toString(
            "base64",
          ),
          abort,
        },
      );
      assert.deepEqual(result.backends, abort ? ["auto"] : ["auto", "wasm"]);
      if (abort) assert.equal(result.aborted, true);
      else assert.equal(result.lines, 1);
      await page.close();
    }
    console.log("GPU prediction failure -> CPU retry; abort -> no retry: PASS");
  } finally {
    await browser.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
