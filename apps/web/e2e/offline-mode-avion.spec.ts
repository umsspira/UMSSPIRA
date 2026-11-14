import { test, expect, type Page } from '@playwright/test';

const USER_EMAIL = process.env.E2E_USER_EMAIL ?? 'demo@umsspira.test';
const USER_PASSWORD = process.env.E2E_USER_PASSWORD ?? 'demo1234';
const PASSES_ROUTE = '/events/catalog/passes';

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[name="email"], input[type="email"]', USER_EMAIL);
  await page.fill('input[name="password"], input[type="password"]', USER_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/portal', { timeout: 15_000 });
}

async function waitForServiceWorker(page: Page) {
  await page.waitForFunction(
    () => navigator.serviceWorker?.controller != null,
    undefined,
    { timeout: 15_000 },
  );
}

test.describe('HU08 · Modo Avión', () => {
  test('CA-01 · login → guardar QR → Modo Avión → recargar → ver QR', async ({ page, context }) => {
    await login(page);
    await waitForServiceWorker(page);

    await page.goto(PASSES_ROUTE);
    const saveButton = page.getByRole('button', { name: /guardar nuevo qr/i });
    test.skip((await saveButton.count()) === 0, 'No hay pase autorizado para la cuenta E2E');
    await saveButton.first().click();
    await expect(page.getByText(/disponible offline/i).first()).toBeVisible({ timeout: 10_000 });

    await context.setOffline(true);
    await page.reload();

    await page.goto(PASSES_ROUTE);
    await expect(
      page.getByText(/sin conexión: se muestran los pases guardados/i),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.locator('[data-testid="qr-canvas"], [data-testid="qr-image"], canvas, img[alt*="QR" i]').first(),
    ).toBeVisible();

    await context.setOffline(false);
  });

  test('CA-04 · logout en Modo Avión no muestra datos privados', async ({ page, context }) => {
    await login(page);
    await waitForServiceWorker(page);

    const logout = page.getByRole('button', { name: /cerrar sesión|logout|salir/i });
    if ((await logout.count()) > 0) {
      await logout.first().click();
      await page.waitForURL('**/login', { timeout: 10_000 }).catch(() => {});
    }

    await context.setOffline(true);
    await page.reload();
    await page.goto(PASSES_ROUTE);

    await expect(page.locator('canvas, img[alt*="QR" i]')).toHaveCount(0);
    await context.setOffline(false);
  });

  test('CA-06 · ruta no cacheada muestra la página de respaldo', async ({ page, context }) => {
    await login(page);
    await waitForServiceWorker(page);

    await context.setOffline(true);
    await page.goto('/portal/mensajes');

    await expect(page.getByTestId('offline-title')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('offline-retry')).toBeVisible();
    await expect(page.getByTestId('offline-link-passes')).toBeVisible();
    await expect(page.getByTestId('offline-link-events')).toBeVisible();

    await context.setOffline(false);
  });

  test('CA-06 · QR guardados visibles con el servicio de pases caído', async ({ page, context }) => {
    await login(page);
    await waitForServiceWorker(page);

    await page.goto(PASSES_ROUTE);
    const saveButton = page.getByRole('button', { name: /guardar nuevo qr/i });
    test.skip((await saveButton.count()) === 0, 'No hay pase autorizado para la cuenta E2E');
    await saveButton.first().click();
    await expect(page.getByText(/disponible offline/i).first()).toBeVisible({ timeout: 10_000 });

    await context.route('**/api/v1/registrations/my-passes', (route) => route.abort());

    await page.reload();
    await page.goto(PASSES_ROUTE);
    await expect(
      page.getByText(/sin conexión: se muestran los pases guardados/i),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.locator('canvas, img[alt*="QR" i]').first(),
    ).toBeVisible();
  });
});