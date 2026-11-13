const { readFileSync, writeFileSync, mkdirSync } = require("node:fs");
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
    const page = await browser.newPage();
    if (process.env.OCR_DISABLE_WEBGPU === "1") {
      await page.route("**/ocr/runtime/paddle-worker.js", (route) =>
        route.fulfill({
          contentType: "text/javascript",
          body:
            'Object.defineProperty(self.navigator, "gpu", {value: undefined});\n' +
            readFileSync(
              resolve("public/ocr/runtime/paddle-worker.js"),
              "utf8",
            ),
        }),
      );
    }
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") console.log("Browser:", m.text().slice(0, 300));
    });
    await page.route("**/__hu13-reader.mjs", (route) =>
      route.fulfill({
        contentType: "text/javascript",
        body: compiled.outputFiles[0].text,
      }),
    );
    await page.route("**/__hu13-spike", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: "<!doctype html><title>HU-13 OCR local</title><p>Muestras ficticias de OCR</p>",
      }),
    );
    await page.goto(
      `${process.env.OCR_BASE_URL || "http://localhost:3001"}/__hu13-spike`,
    );
    const results = [];
    for (const [name, mime] of [
      ["respaldo.png", "image/png"],
      ["respaldo.jpg", "image/jpeg"],
      ["respaldo-escaneado.pdf", "application/pdf"],
    ]) {
      const bytes = readFileSync(resolve("tests/fixtures/ocr", name)).toString(
        "base64",
      );
      const result = await page.evaluate(
        async ({ bytes, mime }) => {
          const { readOcrDocument, getOcrRuntime } =
            await import("/__hu13-reader.mjs");
          const blob = new Blob(
            [Uint8Array.from(atob(bytes), (c) => c.charCodeAt(0))],
            { type: mime },
          );
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 240000);
          let ticks = 0;
          const timer = setInterval(() => ticks++, 50);
          try {
            return {
              reading: await readOcrDocument(
                blob,
                controller.signal,
                (message) => console.log(message),
              ),
              ticks,
              runtime: getOcrRuntime(),
            };
          } finally {
            clearTimeout(timeout);
            clearInterval(timer);
          }
        },
        { bytes, mime },
      );
      results.push({ name, browser: await browser.version(), ...result });
      console.log(name, JSON.stringify(result));
    }
    mkdirSync("../../tmp/hu13", { recursive: true });
    writeFileSync(
      "../../tmp/hu13/browser-ocr-results.json",
      JSON.stringify({ results, errors }, null, 2),
    );

    const required = [
      "José Andrés",
      "Pérez Mamani",
      "5918234",
      "Ingeniería de Sistemas",
      "2023",
      "201704981",
    ];
    if (
      errors.length ||
      results.some(
        (r) =>
          required.some(
            (text) => !r.reading.lines.some((line) => line.text.includes(text)),
          ) || r.ticks < 1,
      )
    )
      throw new Error("OCR reading or responsiveness failed.");
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
