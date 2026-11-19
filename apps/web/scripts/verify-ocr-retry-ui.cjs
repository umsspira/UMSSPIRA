const { strict: assert } = require("node:assert");
const { mkdirSync, writeFileSync } = require("node:fs");
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE || "@playwright/test",
);
const base = process.env.OCR_BASE_URL || "http://localhost:3030";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw new Error("Solo se admiten pruebas locales.");
const applicationId = "13000000-0000-4000-8000-000000000005";
const output = "../../tmp/hu13";

async function main() {
  mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.OCR_BROWSER_PATH
      ? { executablePath: process.env.OCR_BROWSER_PATH }
      : {}),
  });
  try {
    const context = await browser.newContext();
    const login = await context.request.post(`${base}/api/v1/auth/login`, {
      data: { email: "admin@umss.edu.bo", password: "admin1234" },
    });
    assert.equal(login.status(), 200);
    const page = await context.newPage();
    await page.setViewportSize({ width: 1366, height: 900 });
    const responses = [];
    page.on("response", (response) => {
      const url = new URL(response.url());
      if (
        url.pathname.includes("/applications/") &&
        url.pathname.includes("/ocr")
      )
        responses.push({
          path: url.pathname,
          method: response.request().method(),
          status: response.status(),
        });
    });
    await page.goto(`${base}/applications`);
    await page.getByText("hu13.ficticio@example.com", { exact: true }).click();
    const retry = page.getByRole("button", {
      name: "Reintentar análisis",
      exact: true,
    });
    await retry.waitFor();
    await retry.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${output}/ocr-retry-before.jpg` });
    await retry.click();
    await page
      .getByText("Lectura completada", { exact: true })
      .waitFor({ timeout: 240000 });
    await page
      .getByText("Sugerencia: aprobar", { exact: true })
      .scrollIntoViewIfNeeded();
    const read = await context.request.get(
      `${base}/api/v1/applications/${applicationId}/ocr`,
    );
    assert.equal(read.status(), 200);
    const analyses = (await read.json()).data;
    const current = analyses.find((item) => item.current);
    assert.equal(current.status, "COMPLETADO");
    assert.equal(current.result.suggestion, "APROBAR");
    assert.equal(current.result.findings.length, 6);
    assert.ok(
      analyses.some((item) => !item.current && item.result),
      "Se conserva el análisis anterior",
    );
    assert.equal(
      responses.filter((item) => item.path.endsWith("/retry")).length,
      1,
    );
    assert.equal(
      responses.find((item) => item.path.endsWith("/retry")).status,
      201,
    );
    await page.screenshot({ path: `${output}/ocr-retry-completed.jpg` });

    // Deliberate local HTTP failure: cached results must survive and the query can be retried.
    const query = `**/api/v1/applications/${applicationId}/ocr`;
    await page.route(query, (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: { code: "BACKEND_UNAVAILABLE" } }),
      }),
    );
    await page.evaluate(() =>
      window.dispatchEvent(new Event("umsspira:ocr-updated")),
    );
    await page.getByText(/El servidor no pudo responder.*HTTP 503/).waitFor();
    assert.equal(
      await page.getByText("Sugerencia: aprobar", { exact: true }).isVisible(),
      true,
    );
    await page
      .getByRole("button", { name: "Volver a consultar" })
      .scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${output}/ocr-query-unavailable.jpg` });
    await page.unroute(query);
    await page.getByRole("button", { name: "Volver a consultar" }).click();
    await page
      .getByText(/El servidor no pudo responder.*HTTP 503/)
      .waitFor({ state: "hidden" });
    writeFileSync(
      `${output}/ocr-retry-ui-results.json`,
      JSON.stringify(
        {
          at: new Date().toISOString(),
          environment: "local hu13_repair",
          revision: current.revision,
          status: current.status,
          suggestion: current.result.suggestion,
          findings: current.result.findings.length,
          history: analyses.length,
          responses,
          query503:
            "simulado localmente; resultado conservado y consulta recuperada",
        },
        null,
        2,
      ),
    );
    console.log(
      "OCR UI: reintento explícito, lectura real, seis campos, historial conservado y recuperación de consulta 503: PASS",
    );
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
