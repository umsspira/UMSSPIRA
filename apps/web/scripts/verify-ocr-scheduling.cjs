const { strict: assert } = require("node:assert");
const { resolve } = require("node:path");
const { build } = require("esbuild");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.OCR_BASE_URL || "http://localhost:3001";

async function main() {
  const compiled = await build({
    entryPoints: [
      resolve("src/modules/applications/frontend/services/ocr-control.ts"),
    ],
    bundle: true,
    format: "esm",
    platform: "browser",
    write: false,
  });
  const reader = await build({
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
    const context = await browser.newContext();
    await context.route("**/__schedule", (r) =>
      r.fulfill({
        contentType: "text/html",
        body: "<!doctype html><title>OCR scheduling</title>",
      }),
    );
    await context.route("**/control.mjs", (r) =>
      r.fulfill({
        contentType: "text/javascript",
        body: compiled.outputFiles[0].text,
      }),
    );
    await context.route("**/reader.mjs", (r) =>
      r.fulfill({
        contentType: "text/javascript",
        body: reader.outputFiles[0].text,
      }),
    );
    const first = await context.newPage();
    const second = await context.newPage();
    for (const page of [first, second]) await page.goto(`${base}/__schedule`);
    await first.evaluate(async () => {
      const { withOcrSlot, withOcrDeadline } = await import("/control.mjs");
      window.controller = new AbortController();
      window.work = withOcrSlot(window.controller.signal, () => {
        window.started = true;
        return withOcrDeadline(
          () => new Promise(() => {}),
          window.controller.signal,
          10000,
        );
      }).catch(() => {
        window.cancelled = true;
      });
    });
    await first.waitForFunction(() => window.started === true);
    await second.evaluate(async () => {
      const { withOcrSlot } = await import("/control.mjs");
      window.waiting = withOcrSlot(new AbortController().signal, async () => {
        window.started = true;
      });
    });
    assert.equal(
      await second.evaluate(() => window.started === true),
      false,
      "Second tab must wait for the first worker",
    );
    await first.evaluate(async () => {
      window.controller.abort();
      await window.work;
    });
    await second.waitForFunction(() => window.started === true);
    assert.equal(await first.evaluate(() => window.cancelled), true);

    // A stalled SDK creation must also be cancellable, before initialize/predict exist.
    await context.route("**/ocr/runtime/sdk.mjs", (r) =>
      r.fulfill({
        contentType: "text/javascript",
        body: "export const PaddleOCR={create:()=>new Promise(()=>{})};",
      }),
    );
    const result = await second.evaluate(async () => {
      Object.defineProperty(navigator, "gpu", {
        configurable: true,
        value: undefined,
      });
      const { readOcrDocument } = await import("/reader.mjs");
      const controller = new AbortController();
      const start = performance.now();
      setTimeout(() => controller.abort(new Error("cancelled-init")), 100);
      try {
        await readOcrDocument(
          new Blob(["test"], { type: "image/png" }),
          controller.signal,
          () => {},
        );
        return { cancelled: false };
      } catch (error) {
        return {
          cancelled: error.message === "cancelled-init",
          elapsed: performance.now() - start,
        };
      }
    });
    assert.equal(result.cancelled, true);
    assert.ok(
      result.elapsed < 3000,
      "SDK creation must not keep the queue blocked",
    );
    console.log(
      "Two real tabs: one OCR slot; cancellation releases next tab; stalled SDK initialization cancels: PASS",
    );
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
