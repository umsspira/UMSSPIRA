import { performance } from 'node:perf_hooks';
import { expect, test } from '@playwright/test';

const storageState = process.env.HU18_STORAGE_STATE;
const enabled = process.env.HU18_RUN_REAL === '1' && Boolean(storageState) && Boolean(process.env.E2E_BASE_URL);

test.use({ storageState, trace: 'off', screenshot: 'off', video: 'off' });

test('HU-18: 50 afinidades reales en menos de 3 segundos y listado adaptable', async ({ page }) => {
  test.skip(!enabled, 'Requiere entorno de prueba real y sesión sintética de titulado.');
  await page.setViewportSize({ width: 1440, height: 900 });

  const start = performance.now();
  const response = await page.goto('/job-postings', { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBe(200);
  const rows = page.locator('main table tbody tr');
  await expect(rows).toHaveCount(50);
  await expect.poll(async () => {
    const badges = await rows.locator('td:nth-child(3)').allTextContents();
    return badges.filter((badge) => /\b\d{1,3}%\s+Afinidad\b/i.test(badge)).length;
  }, { timeout: 20_000, message: 'Las 50 vacantes deben mostrar afinidad calculada' }).toBe(50);
  const elapsedMs = performance.now() - start;
  console.log(`HU-18: listado con 50 afinidades en ${elapsedMs.toFixed(0)} ms`);
  expect(elapsedMs, 'La carga completa debe ser menor a 3 segundos').toBeLessThan(3_000);

  const table = page.locator('main table');
  await expect(table.locator('thead')).toHaveCSS('display', 'table-header-group');
  await page.setViewportSize({ width: 360, height: 800 });
  await expect(table.locator('thead')).toHaveCSS('position', 'absolute');
  await expect(rows.first().getByText('Empresa:', { exact: true })).toBeVisible();
  await expect(rows.first().getByRole('link', { name: /Ver oferta:/ })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, 'La página móvil no debe tener desbordamiento horizontal').toBeLessThanOrEqual(2);
});
