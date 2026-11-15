const { mkdirSync } = require('node:fs');
const { strict: assert } = require('node:assert');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.OCR_BASE_URL || 'http://localhost:3001';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Solo se admiten pruebas locales.');
async function main() {
  const browser = await chromium.launch({ headless: true, ...(process.env.OCR_BROWSER_PATH ? { executablePath: process.env.OCR_BROWSER_PATH } : {}) });
  try {
    const contexts = await Promise.all([browser.newContext(), browser.newContext()]);
    for (const context of contexts) {
      const login = await context.request.post(`${base}/api/v1/auth/login`, { data: { email: 'admin@umss.edu.bo', password: 'admin1234' } });
      assert.equal(login.status(), 200, 'La cuenta ficticia local debe iniciar sesión');
    }
    const pages = await Promise.all(contexts.map(context => context.newPage()));
    await Promise.all(pages.map(async page => {
      await page.setViewportSize({ width: 1366, height: 900 });
      await page.goto(`${base}/applications`);
      await page.getByText('hu13.ficticio@example.com', { exact: true }).click();
      await page.getByText('Sugerencia: aprobar', { exact: true }).waitFor({ timeout: 240000 });
    }));
    const analyses = await Promise.all(contexts.map(async context => {
      const response = await context.request.get(`${base}/api/v1/applications/13000000-0000-4000-8000-000000000005/ocr`);
      assert.equal(response.status(), 200);
      return (await response.json()).data.find(item => item.current);
    }));
    assert.equal(analyses[0].id, analyses[1].id, 'Ambas sesiones deben ver el mismo trabajo');
    assert.equal(analyses[0].completedAt, analyses[1].completedAt);
    assert.equal(analyses[0].result.suggestion, 'APROBAR');
    assert.equal(analyses[0].result.findings.length, 6);
    const page = pages[0];
    mkdirSync('../../tmp/hu13', { recursive: true });
    await page.getByText('Sugerencia: aprobar', { exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: '../../tmp/hu13/ocr-desktop.png' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByText('Sugerencia: aprobar', { exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: '../../tmp/hu13/ocr-mobile.png' });
    console.log('HU-13 UI: dos sesiones comparten seis hallazgos y fecha; escritorio y móvil: PASS');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
